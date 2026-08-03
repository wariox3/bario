import { fromIsoDate, toIsoDate, type ErpSelectOption } from '@reddoc/core';
import { PROGRAMACION_BANDERAS } from './programacion.banderas';
import type { Programacion, ProgramacionBanderas, ProgramacionPayload } from './programacion.model';
import type { ProgramacionFormRawValue } from './programacion-form.types';

/**
 * El grupo de nómina lleva colgados su periodo y la duración de ese periodo.
 *
 * `<lib-api-select>` guarda la **fila cruda** del endpoint como valor del control
 * (`ErpSelectOption` admite campos extra), así que estos dos salen directo de la
 * opción elegida sin una segunda petición.
 *
 * ⚠️ Nombres **supuestos**: `periodo_id` y `periodo__dias` (con doble guion bajo)
 * salen de `grupoSeleccionado.periodo__dias` del ERP anterior, no de una respuesta
 * verificada. Si el catálogo los nombra distinto, el periodo queda en null y la
 * validación de duración no aplica — falla en silencio, así que es lo primero a
 * confirmar.
 */
export function periodoDelGrupo(grupo: ErpSelectOption | null): number | null {
  const valor = grupo?.['periodo_id'];
  return typeof valor === 'number' ? valor : null;
}

/** Días que dura el periodo del grupo; `0` cuando no se puede determinar. */
export function diasDelPeriodo(grupo: ErpSelectOption | null): number {
  const valor = grupo?.['periodo__dias'];
  return typeof valor === 'number' ? valor : 0;
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
    fecha_hasta_periodo: fromIsoDate(read.fecha_hasta_periodo),
    comentario: read.comentario,
    pago_tipo:
      read.pago_tipo_id != null
        ? { id: read.pago_tipo_id, nombre: read.pago_tipo_nombre ?? '' }
        : null,
    // El grupo se reconstruye sin `periodo__dias`: la opción cruda solo la trae el
    // catálogo. La validación de duración se re-arma cuando el select carga y el
    // usuario toca el campo; en edición pura no se re-valida el periodo existente.
    grupo:
      read.grupo_id != null
        ? {
            id: read.grupo_id,
            nombre: read.grupo_nombre ?? '',
            periodo_id: read.periodo_id,
          }
        : null,
  };
}

/**
 * Valores del formulario → payload de la API.
 *
 * El `periodo` no se teclea: sale del grupo elegido. En edición, si la opción
 * cruda del catálogo todavía no cargó, cae al que ya tenía la programación
 * (`periodoActual`) para no borrarlo en un PUT.
 */
export function formValueToPayload(
  raw: ProgramacionFormRawValue,
  periodoActual: number | null = null,
): ProgramacionPayload {
  return {
    ...soloBanderas(raw),
    nombre: raw.nombre,
    fecha_desde: toIsoDate(raw.fecha_desde),
    fecha_hasta: toIsoDate(raw.fecha_hasta),
    fecha_hasta_periodo: toIsoDate(raw.fecha_hasta_periodo),
    comentario: raw.comentario,
    pago_tipo: raw.pago_tipo?.id ?? null,
    grupo: raw.grupo?.id ?? null,
    periodo: periodoDelGrupo(raw.grupo) ?? periodoActual,
  };
}
