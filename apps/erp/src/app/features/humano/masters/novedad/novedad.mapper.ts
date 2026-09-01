import { fromIsoDate, toIsoDate } from '@reddoc/core';
import type { Novedad, NovedadPayload } from './novedad.model';
import type { NovedadFormRawValue } from './pages/novedad-form/novedad-form.types';
import { diasDeNovedad } from './novedad.rules';

/** Decimal del backend (`"15.000"`) → número para el control; nulo o inválido → 0. */
function aDias(valor: string | number | null | undefined): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Adapta el read-model (`Novedad`) a los valores del reactive form.
 *
 * Las FK se reagrupan en `{ id, nombre }` con el companion `*_nombre` (los
 * selectores resuelven la etiqueta, pero el contrato usa autocomplete sin
 * precarga, así que el nombre es necesario en edición). Las fechas ISO → `Date`.
 * Solo se mapean los campos editables; los calculados por el backend se ignoran.
 */
export function novedadToFormValue(n: Novedad): Partial<NovedadFormRawValue> {
  return {
    contrato:
      n.contrato != null
        ? {
            id: n.contrato,
            nombre: n.contrato_nombre ?? '',
            numero_identificacion: n.contrato_contacto_numero_identificacion ?? '',
          }
        : null,
    novedad_tipo:
      n.novedad_tipo != null ? { id: n.novedad_tipo, nombre: n.novedad_tipo_nombre ?? '' } : null,
    fecha_desde: fromIsoDate(n.fecha_desde),
    fecha_hasta: fromIsoDate(n.fecha_hasta),
    detalle: n.detalle ?? '',
    fecha_desde_periodo: fromIsoDate(n.fecha_desde_periodo),
    fecha_hasta_periodo: fromIsoDate(n.fecha_hasta_periodo),
    dias_dinero: aDias(n.dias_dinero),
    dias_disfrutados: aDias(n.dias_disfrutados),
    novedad_referencia:
      n.novedad_referencia != null
        ? { id: n.novedad_referencia, nombre: n.novedad_referencia_nombre ?? '' }
        : null,
  };
}

/**
 * Construye el write-model (`NovedadPayload`) desde el valor crudo del form.
 *
 * Las FK exponen solo su `id`; las fechas Date → 'yyyy-mm-dd'. Los campos de
 * vacaciones se leen tal cual del form: cuando el tipo no es vacaciones el
 * componente ya los dejó en 0 / null, así que el payload queda consistente sin
 * lógica de tipo acá (el mapper se mantiene tonto).
 */
export function formValueToPayload(v: NovedadFormRawValue): NovedadPayload {
  return {
    fecha_desde: toIsoDate(v.fecha_desde),
    fecha_hasta: toIsoDate(v.fecha_hasta),
    contrato: v.contrato?.id ?? null,
    novedad_tipo: v.novedad_tipo?.id ?? null,
    detalle: v.detalle || null,
    fecha_desde_periodo: toIsoDate(v.fecha_desde_periodo),
    fecha_hasta_periodo: toIsoDate(v.fecha_hasta_periodo),
    // El backend nuevo espera los días desde el front (`dias` está en
    // `HumNovedadRequest`); el anterior los calculaba solo. Sin esto la novedad
    // se guarda en cero días y el total, que sí calcula el backend, con ella.
    dias: diasDeNovedad(v.fecha_desde, v.fecha_hasta),
    dias_dinero: v.dias_dinero ?? 0,
    dias_disfrutados: v.dias_disfrutados ?? 0,
    novedad_referencia: v.novedad_referencia?.id ?? null,
  };
}
