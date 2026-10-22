import type { ResumenDocumento } from '../calculo';
import { redondearMoneda } from '../calculo';
import { toFiniteNumber } from '../utils/currency.utils';
import { impuestosAgrupadosToResumen } from './documento-impuestos';
import type { DocumentoTotalesRead } from './documento.types';

/**
 * Resumen de las líneas de ítem de un documento guardado, con los acumulados del
 * backend: no necesita tener las líneas cargadas. `null` si la cabecera no trae
 * el desglose por impuesto (solo lo trae `documento/<id>/detalle/`); entonces
 * el resumen se sigue calculando con las líneas.
 *
 * El total se arma con las piezas (`subtotal − descuento + Σ impuestos`) y no con
 * el `total` de la cabecera, para que cuadre con el desglose que se pinta y para
 * que sumarle las cuentas contables (`resumenConCuentas`) no las cuente dos veces
 * si el backend ya las incluyera.
 */
export function resumenDesdeCabecera(read: DocumentoTotalesRead): ResumenDocumento | null {
  if (!read.documento_impuestos) return null;
  const impuestos = impuestosAgrupadosToResumen(read.documento_impuestos);
  const subtotal = toFiniteNumber(read.subtotal) ?? 0;
  const descuento = toFiniteNumber(read.descuento) ?? 0;
  const totalImpuestos = impuestos.reduce((acc, imp) => acc + imp.total, 0);
  return {
    subtotal: redondearMoneda(subtotal),
    descuento: redondearMoneda(descuento),
    impuestos,
    total: redondearMoneda(subtotal - descuento + totalImpuestos),
  };
}
