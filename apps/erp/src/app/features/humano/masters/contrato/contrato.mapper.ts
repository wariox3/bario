import { fromIsoDate, toFiniteNumber, toIsoDate } from '@reddoc/core';
import type { Contrato, ContratoPayload } from './contrato.model';
import type { ContratoFormRawValue } from './pages/contrato-form/contrato-form.types';

/**
 * Adapta el read-model (`Contrato`) a los valores del reactive form.
 *
 * Las FK se reagrupan en `{ id, nombre }` usando el companion `*_nombre` que
 * devuelve el backend para pintar la etiqueta en edición (los `<lib-api-select>`
 * también la resuelven por `id` al cargar opciones, pero las ciudades usan
 * `<lib-api-autocomplete>`, que no precarga, así que el `*_nombre` es necesario).
 * `salario` llega como string Decimal → se normaliza a número para el inputnumber.
 */
export function contratoToFormValue(c: Contrato): Partial<ContratoFormRawValue> {
  return {
    contacto:
      c.contacto != null
        ? {
            id: c.contacto,
            nombre: c.contacto_nombre ?? '',
            numero_identificacion: c.contacto_numero_identificacion ?? '',
          }
        : null,
    contrato_tipo:
      c.contrato_tipo != null
        ? { id: c.contrato_tipo, nombre: c.contrato_tipo_nombre ?? '' }
        : null,
    cargo: c.cargo != null ? { id: c.cargo, nombre: c.cargo_nombre ?? '' } : null,
    grupo: c.grupo != null ? { id: c.grupo, nombre: c.grupo_nombre ?? '' } : null,
    sucursal: c.sucursal != null ? { id: c.sucursal, nombre: c.sucursal_nombre ?? '' } : null,
    tiempo: c.tiempo != null ? { id: c.tiempo, nombre: c.tiempo_nombre ?? '' } : null,
    ciudad_contrato:
      c.ciudad_contrato != null
        ? { id: c.ciudad_contrato, nombre: c.ciudad_contrato_nombre ?? '' }
        : null,
    ciudad_labora:
      c.ciudad_labora != null
        ? { id: c.ciudad_labora, nombre: c.ciudad_labora_nombre ?? '' }
        : null,
    fecha_desde: fromIsoDate(c.fecha_desde),
    fecha_hasta: fromIsoDate(c.fecha_hasta),
    habilitado_turno: c.habilitado_turno,
    salario: toFiniteNumber(c.salario),
    auxilio_transporte: c.auxilio_transporte,
    salario_integral: c.salario_integral,
    tipo_costo:
      c.tipo_costo != null ? { id: c.tipo_costo, nombre: c.tipo_costo_nombre ?? '' } : null,
    // El control se llama `centro_costo` (vocabulario de la UI); el campo del
    // backend es `grupo_contabilidad`. Ver `contrato.model.ts`.
    centro_costo:
      c.grupo_contabilidad != null
        ? { id: c.grupo_contabilidad, nombre: c.grupo_contabilidad_nombre ?? '' }
        : null,
    salud: c.salud != null ? { id: c.salud, nombre: c.salud_nombre ?? '' } : null,
    entidad_salud:
      c.entidad_salud != null
        ? { id: c.entidad_salud, nombre: c.entidad_salud_nombre ?? '' }
        : null,
    pension: c.pension != null ? { id: c.pension, nombre: c.pension_nombre ?? '' } : null,
    entidad_pension:
      c.entidad_pension != null
        ? { id: c.entidad_pension, nombre: c.entidad_pension_nombre ?? '' }
        : null,
    entidad_cesantias:
      c.entidad_cesantias != null
        ? { id: c.entidad_cesantias, nombre: c.entidad_cesantias_nombre ?? '' }
        : null,
    entidad_caja:
      c.entidad_caja != null ? { id: c.entidad_caja, nombre: c.entidad_caja_nombre ?? '' } : null,
    riesgo: c.riesgo != null ? { id: c.riesgo, nombre: c.riesgo_nombre ?? '' } : null,
    tipo_cotizante:
      c.tipo_cotizante != null
        ? { id: c.tipo_cotizante, nombre: c.tipo_cotizante_nombre ?? '' }
        : null,
    subtipo_cotizante:
      c.subtipo_cotizante != null
        ? { id: c.subtipo_cotizante, nombre: c.subtipo_cotizante_nombre ?? '' }
        : null,
    motivo_terminacion:
      c.motivo_terminacion != null
        ? { id: c.motivo_terminacion, nombre: c.motivo_terminacion_nombre ?? '' }
        : null,
    fecha_ultimo_pago: fromIsoDate(c.fecha_ultimo_pago),
    fecha_ultimo_pago_prima: fromIsoDate(c.fecha_ultimo_pago_prima),
    fecha_ultimo_pago_cesantia: fromIsoDate(c.fecha_ultimo_pago_cesantia),
    fecha_ultimo_pago_vacacion: fromIsoDate(c.fecha_ultimo_pago_vacacion),
    comentario: c.comentario ?? '',
  };
}

/**
 * Construye el write-model (`ContratoPayload`) desde el valor crudo del form.
 * Las FK exponen solo su `id`; las fechas Date → 'yyyy-mm-dd'; los strings vacíos
 * se normalizan a `null`.
 */
export function formValueToPayload(v: ContratoFormRawValue): ContratoPayload {
  return {
    fecha_desde: toIsoDate(v.fecha_desde),
    fecha_hasta: toIsoDate(v.fecha_hasta),
    salario: v.salario ?? null,
    auxilio_transporte: v.auxilio_transporte ?? false,
    salario_integral: v.salario_integral ?? false,
    habilitado_turno: v.habilitado_turno ?? false,
    comentario: v.comentario || null,
    fecha_ultimo_pago: toIsoDate(v.fecha_ultimo_pago),
    fecha_ultimo_pago_prima: toIsoDate(v.fecha_ultimo_pago_prima),
    fecha_ultimo_pago_cesantia: toIsoDate(v.fecha_ultimo_pago_cesantia),
    fecha_ultimo_pago_vacacion: toIsoDate(v.fecha_ultimo_pago_vacacion),
    cargo: v.cargo?.id ?? null,
    ciudad_contrato: v.ciudad_contrato?.id ?? null,
    ciudad_labora: v.ciudad_labora?.id ?? null,
    contacto: v.contacto?.id ?? null,
    contrato_tipo: v.contrato_tipo?.id ?? null,
    entidad_caja: v.entidad_caja?.id ?? null,
    entidad_cesantias: v.entidad_cesantias?.id ?? null,
    entidad_pension: v.entidad_pension?.id ?? null,
    entidad_salud: v.entidad_salud?.id ?? null,
    grupo: v.grupo?.id ?? null,
    grupo_contabilidad: v.centro_costo?.id ?? null,
    motivo_terminacion: v.motivo_terminacion?.id ?? null,
    pension: v.pension?.id ?? null,
    riesgo: v.riesgo?.id ?? null,
    salud: v.salud?.id ?? null,
    subtipo_cotizante: v.subtipo_cotizante?.id ?? null,
    sucursal: v.sucursal?.id ?? null,
    tiempo: v.tiempo?.id ?? null,
    tipo_costo: v.tipo_costo?.id ?? null,
    tipo_cotizante: v.tipo_cotizante?.id ?? null,
  };
}
