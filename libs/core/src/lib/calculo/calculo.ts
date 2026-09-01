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
 * COP no maneja decimales en uso (`formatCop` formatea sin decimales), así que
 * se redondea a entero. Si algún día se necesitan decimales o medio-par, este
 * es el único lugar a cambiar.
 */
export function redondearMoneda(n: number): number {
  return Math.round(n);
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
        total: (prev?.total ?? 0) + imp.total,
      });
    }
  }

  const impuestos = [...acc.values()];
  const totalImpuestos = impuestos.reduce((s, i) => s + i.total, 0);
  const total = subtotal - descuento + totalImpuestos;

  return { subtotal, descuento, impuestos, total };
}
