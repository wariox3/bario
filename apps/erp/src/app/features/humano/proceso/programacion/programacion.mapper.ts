import { fromIsoDate, toIsoDate, type ErpSelectOption } from '@reddoc/core';
import { PROGRAMACION_BANDERAS } from './programacion.banderas';
import type { Programacion, ProgramacionBanderas, ProgramacionPayload } from './programacion.model';
import type { ProgramacionFormRawValue } from './programacion-form.types';

/**
 * Días que dura el periodo del grupo; `0` cuando no se puede determinar.
 *
 * `/humano/grupo/seleccionar/` trae `periodo_dias` en cada fila, y
 * `<lib-api-select>` guarda la **fila cruda** como valor del control
 * (`ErpSelectOption` admite campos extra), así que al elegir un grupo el dato
 * viene en la opción.
 *
 * En edición no: el grupo se reconstruye desde la programación guardada, que no
 * trae los días. Ahí se buscan en `catalogo` —las opciones que ya cargó el
 * select— por id, sin una petición aparte.
 */
export function diasDelPeriodo(
  grupo: ErpSelectOption | null,
  catalogo: readonly ErpSelectOption[] = [],
): number {
  if (!grupo) return 0;
  const propio = grupo['periodo_dias'];
  if (typeof propio === 'number') return propio;
  const delCatalogo = catalogo.find((opcion) => opcion.id === grupo.id)?.['periodo_dias'];
  return typeof delCatalogo === 'number' ? delCatalogo : 0;
}

/** Extrae solo las banderas de un objeto que las contenga. */
function soloBanderas(fuente: ProgramacionBanderas): ProgramacionBanderas {
  // Se recorre la metadata en vez de listar 17 campos: así agregar una bandera
  // no obliga a tocar el mapper.
  const banderas = {} as Record<keyof ProgramacionBanderas, boolean>;
  for (const { clave } of PROGRAMACION_BANDERAS) banderas[clave] = fuente[clave];
  return banderas as ProgramacionBanderas;
}

/** Read-model (GET) → valores del formulario (edición). */
export function programacionToFormValue(read: Programacion): Partial<ProgramacionFormRawValue> {
  return {
    ...soloBanderas(read),
    nombre: read.nombre,
    fecha_desde: fromIsoDate(read.fecha_desde),
    fecha_hasta: fromIsoDate(read.fecha_hasta),
    comentario: read.comentario,
    pago_tipo:
      read.pago_tipo != null ? { id: read.pago_tipo, nombre: read.pago_tipo_nombre ?? '' } : null,
    // Sin `periodo_dias`: la programación no lo trae. `diasDelPeriodo` lo busca
    // en el catálogo del select cuando carga.
    grupo: read.grupo != null ? { id: read.grupo, nombre: read.grupo_nombre ?? '' } : null,
  };
}

/**
 * Valores del formulario → payload de la API.
 *
 * El `periodo` no viaja: el backend lo toma del grupo.
 */
export function formValueToPayload(raw: ProgramacionFormRawValue): ProgramacionPayload {
  return {
    ...soloBanderas(raw),
    nombre: raw.nombre,
    fecha_desde: toIsoDate(raw.fecha_desde),
    fecha_hasta: toIsoDate(raw.fecha_hasta),
    // El backend lo exige, pero el formulario ya no lo pide: el periodo cierra con el rango.
    fecha_hasta_periodo: toIsoDate(raw.fecha_hasta),
    comentario: raw.comentario,
    pago_tipo: raw.pago_tipo?.id ?? null,
    grupo: raw.grupo?.id ?? null,
  };
}
