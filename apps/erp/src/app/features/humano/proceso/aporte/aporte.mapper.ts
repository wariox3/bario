import type { ErpSelectOption } from '@reddoc/core';
import type { AporteFormRawValue } from './aporte-form.types';
import { PRESENTACION, type Aporte, type AportePayload } from './aporte.model';

/**
 * Reconstruye la opción de un select a partir del par `<campo>_id` /
 * `<campo>_nombre` del read-model.
 *
 * `<lib-api-select>` guarda la fila cruda del catálogo como valor del control; en
 * edición esa fila todavía no cargó, así que se arma una equivalente con lo que
 * ya trajo el aporte. Sin esto el campo se ve vacío hasta que responde el
 * catálogo, y un guardado rápido borraría la selección.
 */
function opcionDe(id: number | null, nombre: string | null | undefined): ErpSelectOption | null {
  return id != null ? { id, nombre: nombre ?? '' } : null;
}

/** Read-model (GET) → valores del formulario (edición). */
export function aporteToFormValue(read: Aporte): Partial<AporteFormRawValue> {
  return {
    sucursal: opcionDe(read.sucursal_id, read.sucursal_nombre),
    anio: read.anio,
    mes: read.mes,
    presentacion: read.presentacion ?? PRESENTACION.SUCURSAL,
    entidad_riesgo: opcionDe(read.entidad_riesgo_id, read.entidad_riesgo_nombre),
    entidad_sena: opcionDe(read.entidad_sena_id, read.entidad_sena_nombre),
    entidad_icbf: opcionDe(read.entidad_icbf_id, read.entidad_icbf_nombre),
  };
}

/** Valores del formulario → payload de la API. */
export function formValueToPayload(raw: AporteFormRawValue): AportePayload {
  return {
    sucursal: raw.sucursal?.id ?? null,
    anio: raw.anio,
    mes: raw.mes,
    presentacion: raw.presentacion,
    entidad_riesgo: raw.entidad_riesgo?.id ?? null,
    entidad_sena: raw.entidad_sena?.id ?? null,
    entidad_icbf: raw.entidad_icbf?.id ?? null,
  };
}
