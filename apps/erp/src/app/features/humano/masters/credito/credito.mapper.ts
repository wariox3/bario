import { fromIsoDate, toFiniteNumber, toIsoDate } from '@reddoc/core';
import type { Credito, CreditoPayload } from './credito.model';
import type { CreditoFormRawValue } from './pages/credito-form/credito-form.types';

/**
 * Adapta el read-model (`Credito`) a los valores del reactive form.
 *
 * Las FK se reagrupan en `{ id, nombre }` con el companion `*_nombre` que devuelve
 * el backend (los autocompletes no precargan opciones, así que el `*_nombre` es
 * necesario para pintar la etiqueta en edición). Los montos llegan como string
 * Decimal → se normalizan a número.
 */
export function creditoToFormValue(c: Credito): Partial<CreditoFormRawValue> {
  return {
    contrato:
      c.contrato != null
        ? {
            id: c.contrato,
            nombre: c.contrato_nombre ?? '',
            numero_identificacion: c.contrato_contacto_numero_identificacion ?? '',
          }
        : null,
    concepto: c.concepto != null ? { id: c.concepto, nombre: c.concepto_nombre ?? '' } : null,
    fecha_inicio: fromIsoDate(c.fecha_inicio),
    total: toFiniteNumber(c.total),
    cuota: toFiniteNumber(c.cuota),
    cantidad_cuotas: c.cantidad_cuotas ?? null,
    inactivo: c.inactivo,
    aplica_prima: c.aplica_prima,
    aplica_cesantia: c.aplica_cesantia,
  };
}

/**
 * Construye el write-model (`CreditoPayload`) desde el valor crudo del form.
 * Las FK exponen solo su `id`; la fecha Date → 'yyyy-mm-dd'.
 */
export function formValueToPayload(v: CreditoFormRawValue): CreditoPayload {
  return {
    fecha_inicio: toIsoDate(v.fecha_inicio),
    total: v.total ?? null,
    cuota: v.cuota ?? null,
    cantidad_cuotas: v.cantidad_cuotas ?? null,
    inactivo: v.inactivo ?? false,
    aplica_prima: v.aplica_prima ?? false,
    aplica_cesantia: v.aplica_cesantia ?? false,
    contrato: v.contrato?.id ?? null,
    concepto: v.concepto?.id ?? null,
  };
}
