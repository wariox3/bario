/**
 * Kernel de cálculo de totales de documentos — lógica fiscal pura y cross-app.
 *
 * Es la **verdad fiscal del frontend** (el front es autoritativo: calcula los
 * totales y los persiste). Por eso vive centralizado, sin Angular y con tests:
 * cualquier documento del ERP o del POS reusa exactamente esta aritmética en
 * vez de reimplementarla.
 *
 * Hay dos momentos de cálculo:
 *  1. `calcularImpuestosLinea` — resuelve los montos de impuesto de UNA línea a
 *     partir de su base y sus tasas (la fórmula `base × % × %base`).
 *  2. `calcularResumen` — agrega las líneas (con sus impuestos ya resueltos) en
 *     el resumen del documento.
 */
import type { ImpuestoLinea, LineaCalculo, ResumenDocumento, TasaImpuesto } from './calculo.types';

/**
 * Política de redondeo de moneda — **único punto** donde se redondea.
 *
 * Se redondea a centavos (2 decimales), igual que el backend al persistir cada
 * línea y que `formatCop` al pintar: así el resumen que se ve al editar coincide
 * con el documento guardado. `Number.EPSILON` corrige los casos en que la
 * representación binaria deja el valor un pelo por debajo de la mitad
 * (`1.005 × 100 = 100.49999…`). La mitad se aleja de cero sobre la magnitud,
 * así una retención (negativa) redondea igual que el impuesto positivo
 * equivalente; `Math.round` a secas la llevaría hacia +∞. Si algún día se
 * necesita medio-par, este es el único lugar a cambiar.
 */
export function redondearMoneda(n: number): number {
  const centavos = Math.round((Math.abs(n) + Number.EPSILON) * 100) / 100;
  return n < 0 && centavos !== 0 ? -centavos : centavos;
}

/**
 * Resuelve los montos de impuesto de una línea: por cada tasa,
 * `base × (porcentaje / 100) × (porcentajeBase / 100) × operacion`, redondeado.
 * `operacion` (default `1`) pone el signo: una retención (`−1`) produce un monto
 * negativo que los agregados restan del total sin tratamiento especial.
 */
export function calcularImpuestosLinea(
  base: number,
  tasas: readonly TasaImpuesto[],
): ImpuestoLinea[] {
  return tasas.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    total: redondearMoneda(
      base * (t.porcentaje / 100) * (t.porcentajeBase / 100) * (t.operacion ?? 1),
    ),
  }));
}

/**
 * Agrega las líneas en el resumen del documento:
 *  - `subtotal` = Σ bases.
 *  - `descuento` = Σ descuentos.
 *  - `impuestos` = montos agrupados y sumados por id de impuesto (un mismo IVA
 *    repartido en varias líneas aparece una sola vez con el total sumado).
 *  - `total` = subtotal − descuento + Σ impuestos (los montos vienen con signo:
 *    las retenciones son negativas y restan solas).
 *
 * Cada agregado se redondea a centavos: sumar montos con decimales en coma
 * flotante deja colas (`0.1 + 0.2 = 0.30000000000000004`) que no deben llegar
 * a pantalla ni a comparaciones como saldo contra pagos.
 */
export function calcularResumen(lineas: readonly LineaCalculo[]): ResumenDocumento {
  let subtotal = 0;
  let descuento = 0;
  const acc = new Map<number, ImpuestoLinea>();

  for (const linea of lineas) {
    subtotal += linea.base;
    descuento += linea.descuento ?? 0;
    for (const imp of linea.impuestos) {
      const prev = acc.get(imp.id);
      acc.set(imp.id, {
        id: imp.id,
        nombre: imp.nombre,
        total: redondearMoneda((prev?.total ?? 0) + imp.total),
      });
    }
  }

  const impuestos = [...acc.values()];
  const totalImpuestos = impuestos.reduce((s, i) => s + i.total, 0);
  subtotal = redondearMoneda(subtotal);
  descuento = redondearMoneda(descuento);
  const total = redondearMoneda(subtotal - descuento + totalImpuestos);

  return { subtotal, descuento, impuestos, total };
}

/**
 * Resumen de un documento ya guardado más lo que cambió en pantalla:
 * `base + resumen(actuales) − resumen(originales)`.
 *
 * `base` es el resumen que calculó el backend con todas las líneas guardadas;
 * `originales` son esas líneas tal como se leyeron y `actuales`, las que muestra
 * la tabla ahora. Con las mismas líneas de los dos lados el resultado es `base`
 * tal cual: el resumen coincide con el del backend aunque redondee distinto.
 *
 * No hace falta tener todas las líneas: basta con que `actuales` y `originales`
 * cubran las mismas líneas (las cargadas), más las nuevas de un lado y las
 * quitadas del otro. Así puede paginarse la tabla sin perder el total.
 *
 * Un impuesto que queda en cero se omite, salvo que alguna línea actual lo lleve
 * o que venga en `base` sin que ningún cambio lo toque (un IVA 0 %).
 */
export function aplicarDeltas(
  base: ResumenDocumento,
  actuales: readonly LineaCalculo[],
  originales: readonly LineaCalculo[],
): ResumenDocumento {
  const ahora = calcularResumen(actuales);
  const antes = calcularResumen(originales);
  const enAhora = new Set(ahora.impuestos.map((imp) => imp.id));
  const enAntes = new Set(antes.impuestos.map((imp) => imp.id));
  const enBase = new Set(base.impuestos.map((imp) => imp.id));

  const acc = new Map<number, ImpuestoLinea>();
  const sumar = (imp: ImpuestoLinea, signo: 1 | -1): void => {
    const prev = acc.get(imp.id);
    acc.set(imp.id, {
      id: imp.id,
      nombre: prev?.nombre || imp.nombre,
      total: (prev?.total ?? 0) + signo * imp.total,
    });
  };
  for (const imp of base.impuestos) sumar(imp, 1);
  for (const imp of ahora.impuestos) sumar(imp, 1);
  for (const imp of antes.impuestos) sumar(imp, -1);

  const impuestos = [...acc.values()]
    .map((imp) => ({ ...imp, total: redondearMoneda(imp.total) }))
    .filter(
      (imp) =>
        imp.total !== 0 || enAhora.has(imp.id) || (enBase.has(imp.id) && !enAntes.has(imp.id)),
    );

  return {
    subtotal: redondearMoneda(base.subtotal + ahora.subtotal - antes.subtotal),
    descuento: redondearMoneda(base.descuento + ahora.descuento - antes.descuento),
    impuestos,
    total: redondearMoneda(base.total + ahora.total - antes.total),
  };
}
