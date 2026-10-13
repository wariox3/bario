import type { ColumnDef } from '@reddoc/core';
import type {
  DocumentoPorEmitir,
  DocumentoPorEmitirFila,
  EstadoElectronico,
} from './emision-electronica.types';

/** Clic en el estado "Error" de una fila: abre el modal con sus motivos. */
export const VER_ERROR_ACTION_ID = 'ver-error';

/**
 * Estado visible: "error" si el último intento falló; "enviado" si ya se
 * envió y espera respuesta de la DIAN; si no, "pendiente" (aún emitible).
 */
export function resolverEstadoElectronico(row: DocumentoPorEmitir): EstadoElectronico {
  if (row.estado_electronico_error) return 'error';
  return row.estado_electronico_enviado ? 'enviado' : 'pendiente';
}

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

/** Columna Estado: igual en todas las pantallas; solo "Error" es un enlace, en rojo. */
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
  toneFor: (row) => (esError(row) ? 'critical' : null),
};
