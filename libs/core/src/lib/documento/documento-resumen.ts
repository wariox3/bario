import type { ResumenDocumento } from '../calculo';
import { redondearMoneda } from '../calculo';
import { toFiniteNumber } from '../utils/currency.utils';
import { impuestosAgrupadosToResumen } from './documento-impuestos';
import type { DocumentoTotalesRead } from './documento.types';

/** Débitos y créditos de las cuentas contables de un documento. */
export interface CuentasCabecera {
  readonly debitos: number;
  readonly creditos: number;
}

/**
 * Débitos y créditos de las cuentas según el backend (`debito` / `credito` de la
 * cabecera). `null` si la cabecera no los trae: entonces se suman las líneas.
 */
export function cuentasDesdeCabecera(read: DocumentoTotalesRead): CuentasCabecera | null {
  if (read.debito == null && read.credito == null) return null;
  return {
    debitos: redondearMoneda(toFiniteNumber(read.debito) ?? 0),
    creditos: redondearMoneda(toFiniteNumber(read.credito) ?? 0),
  };
}

/**
 * Suma de cantidades de las líneas de ítem según la cabecera (`cantidad_detalles`). `null`
 * si no la trae: entonces se suman las líneas, y quien la muestra no puede
 * paginarlas.
 */
export function cantidadDesdeCabecera(read: DocumentoTotalesRead): number | null {
  return read.cantidad_detalles == null ? null : (toFiniteNumber(read.cantidad_detalles) ?? null);
}

/**
 * Resumen de las líneas de **ítem** de un documento guardado, con los acumulados
 * del backend: no necesita tener las líneas cargadas. `null` si la cabecera no
 * trae el desglose por impuesto (solo lo trae `documento/<id>/detalle/`);
 * entonces el resumen se sigue calculando con las líneas.
 *
 * Deja afuera las cuentas contables: quien lo use les suma las suyas
 * (`resumenConCuentas`), y así no cuentan dos veces. El `total` del backend sí
 * las incluye, así que el de los ítems es `total − debito + credito`.
 *
 * El subtotal no se lee de `subtotal`, que también suma las cuentas, ni de
 * `total_bruto`, cuyo trato del descuento no está confirmado: sale de despejar
 * `total = subtotal − descuento + Σ impuestos`. Así el desglose que se pinta
 * siempre cuadra con el total del backend.
 */
export function resumenDesdeCabecera(read: DocumentoTotalesRead): ResumenDocumento | null {
  if (!read.documento_impuestos) return null;
  const impuestos = impuestosAgrupadosToResumen(read.documento_impuestos);
  const cuentas = cuentasDesdeCabecera(read) ?? { debitos: 0, creditos: 0 };
  const total = (toFiniteNumber(read.total) ?? 0) - cuentas.debitos + cuentas.creditos;
  const descuento = toFiniteNumber(read.descuento) ?? 0;
  const totalImpuestos = impuestos.reduce((acc, imp) => acc + imp.total, 0);
  return {
    subtotal: redondearMoneda(total + descuento - totalImpuestos),
    descuento: redondearMoneda(descuento),
    impuestos,
    total: redondearMoneda(total),
  };
}
