import { toFiniteNumber } from '@reddoc/core';
import type { Adicional, AdicionalPayload } from './adicional.model';
import type { AdicionalFormRawValue } from './pages/adicional-form/adicional-form.types';

/**
 * Adapta el read-model (`Adicional`) a los valores del reactive form.
 *
 * Las FK se reagrupan en `{ id, nombre }` con el companion `*_nombre` que devuelve
 * el backend (los autocompletes no precargan opciones, así que el `*_nombre` es
 * necesario para pintar la etiqueta en edición). `valor` llega como string Decimal
 * → se normaliza a número.
 */
export function adicionalToFormValue(a: Adicional): Partial<AdicionalFormRawValue> {
  return {
    contrato:
      a.contrato != null
        ? {
            id: a.contrato,
            nombre: a.contrato_nombre ?? '',
            numero_identificacion: a.contrato_numero_identificacion ?? '',
          }
        : null,
    concepto: a.concepto != null ? { id: a.concepto, nombre: a.concepto_nombre ?? '' } : null,
    valor: toFiniteNumber(a.valor),
    detalle: a.detalle ?? '',
    aplica_dia_laborado: a.aplica_dia_laborado,
    inactivo: a.inactivo,
  };
}

/**
 * Construye el write-model (`AdicionalPayload`) desde el valor crudo del form.
 * Las FK exponen solo su `id`; el detalle vacío se normaliza a `null`.
 */
export function formValueToPayload(v: AdicionalFormRawValue): AdicionalPayload {
  return {
    valor: v.valor ?? null,
    detalle: v.detalle || null,
    aplica_dia_laborado: v.aplica_dia_laborado ?? false,
    inactivo: v.inactivo ?? false,
    contrato: v.contrato?.id ?? null,
    concepto: v.concepto?.id ?? null,
  };
}
