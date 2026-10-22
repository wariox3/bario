import type { ImpuestoLinea } from '../calculo';
import { toFiniteNumber } from '../utils/currency.utils';
import type { DocumentoImpuestoAgrupadoRead } from './documento.types';

/**
 * Pasa los impuestos agrupados del backend (`documento_impuestos`) al desglose
 * del resumen, con signo: las retenciones restan solas, como en `calcularResumen`.
 *
 * El monto sale de `total` (sin signo) y de `impuesto_operacion`, no de
 * `total_operado`: el backend lo devuelve en `0` aunque el impuesto sume al total
 * del documento (factura de compra 131: IVA con `total` 308085 y `total_operado`
 * 0, y el `total` de la cabecera sí lo incluye).
 */
export function impuestosAgrupadosToResumen(
  impuestos: readonly DocumentoImpuestoAgrupadoRead[],
): ImpuestoLinea[] {
  return impuestos.map((imp) => ({
    id: imp.impuesto_id,
    nombre: imp.impuesto_nombre_extendido || imp.impuesto_nombre,
    total: Math.abs(toFiniteNumber(imp.total) ?? 0) * (imp.impuesto_operacion < 0 ? -1 : 1),
  }));
}
