import type { ColumnDef } from '@reddoc/core';
import type {
  DocumentoPorEmitir,
  DocumentoPorEmitirFila,
  EstadoElectronico,
} from './emision-electronica.types';

/** Clic en el estado "Error" de una fila: abre el modal con sus motivos. */
export const VER_ERROR_ACTION_ID = 'ver-error';

/**
 * ¿Ya salió hacia la DIAN y espera su respuesta? `estado_electronico_enviando`
 * es la bandera para eso; `enviado` se sigue leyendo mientras el backend no la
 * mande en `lista/`, para no volver a ofrecer lo que ya se envió.
 */
export function esperaRespuesta(row: DocumentoPorEmitir): boolean {
  return !!row.estado_electronico_enviando || row.estado_electronico_enviado;
}

/**
 * Estado visible: "Pendiente respuesta" si ya se envió y espera a la DIAN —gana
 * sobre un error anterior: hay un intento nuevo en camino—; "Error" si el último
 * intento falló; si no, "Pendiente envío" (aún emitible).
 */
export function resolverEstadoElectronico(row: DocumentoPorEmitir): EstadoElectronico {
  if (esperaRespuesta(row)) return 'pendienteRespuesta';
  if (row.estado_electronico_error) return 'error';
  return 'pendienteEnvio';
}

/** Solo se marca lo que aún se puede emitir: lo que espera respuesta queda sin check. */
export const esSeleccionable = (row: unknown): boolean =>
  !esperaRespuesta(row as DocumentoPorEmitir);

/** Une prefijo y número de la resolución, sin relleno si faltan. */
export function resolverResolucionEtiqueta(row: DocumentoPorEmitir): string {
  return [row.resolucion_prefijo, row.resolucion_numero].filter(Boolean).join(' ');
}

export function aFilaPorEmitir(row: DocumentoPorEmitir): DocumentoPorEmitirFila {
  return {
    ...row,
    estado_electronico_estado: resolverEstadoElectronico(row),
    resolucion_etiqueta: resolverResolucionEtiqueta(row),
  };
}

const esError = (row: unknown) =>
  (row as DocumentoPorEmitirFila).estado_electronico_estado === 'error';

/**
 * Columna Estado: igual en todas las pantallas. "Error" es un enlace, en rojo;
 * "Pendiente respuesta" va en ámbar para explicar por qué esa fila no tiene check.
 * "Pendiente envío" queda sin tono: es el estado normal de la pantalla.
 */
export const ESTADO_ELECTRONICO_COLUMN: ColumnDef = {
  field: 'estado_electronico_estado',
  headerKey: 'documentActions.emisionElectronica.columns.estado',
  type: 'enum',
  width: '160px',
  align: 'center',
  enumKeyPrefix: 'documentActions.emisionElectronica.estado',
  cellAction: VER_ERROR_ACTION_ID,
  cellActionFor: esError,
  cellActionLabelKey: 'documentActions.errorElectronico.ver',
  toneFor: (row) => {
    const estado = (row as DocumentoPorEmitirFila).estado_electronico_estado;
    if (estado === 'error') return 'critical';
    return estado === 'pendienteRespuesta' ? 'pending' : null;
  },
};
