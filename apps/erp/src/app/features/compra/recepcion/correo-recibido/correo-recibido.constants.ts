import { toHora, type ColumnDef } from '@reddoc/core';
import type {
  CorreoRecibido,
  CorreoRecibidoEstado,
  CorreoRecibidoOrigen,
} from './correo-recibido.model';

const I18N = 'entities.correoRecibido';

/** Abre los documentos que salieron del correo. */
export const CELL_ACTION_DOCUMENTOS = 'ver-documentos';

export const ESTADOS: readonly CorreoRecibidoEstado[] = [
  'procesado',
  'sin_documentos',
  'error',
  'pendiente',
  'empresa_desconocida',
  'confirmacion_reenvio',
];

export const ORIGENES: readonly CorreoRecibidoOrigen[] = ['correo', 'carga'];

/** Arma la fila de la tabla a partir del correo. */
export function toCorreoRecibidoRow(correo: CorreoRecibido): CorreoRecibidoRow {
  return {
    ...correo,
    recibido_hora: toHora(new Date(correo.recibido_en)) ?? '',
    documentos_count: correo.documentos.length > 0 ? correo.documentos.length : null,
  };
}

/** Fila de la tabla: el correo con su fecha y hora armadas y el conteo de documentos. */
export interface CorreoRecibidoRow extends CorreoRecibido {
  /** Hora local de llegada, `10:19`; la fecha la pinta la columna. */
  readonly recibido_hora: string;
  /** Cuántos documentos salieron; `null` si ninguno, para que la celda quede vacía. */
  readonly documentos_count: number | null;
}

/**
 * Columnas. El estado se tiñe: verde lo procesado, rojo el error; lo demás queda
 * neutro porque no es un fallo (un correo sin XML, una confirmación de reenvío).
 * La cantidad de documentos es el enlace a Documentos filtrado por el correo.
 */
export const COLUMNS: readonly ColumnDef[] = [
  {
    // `field` es el de la API para que el orden viaje tal cual como `ordering`.
    field: 'recibido_en',
    headerKey: `${I18N}.columns.recibido`,
    type: 'combined',
    separator: ' ',
    parts: [{ field: 'recibido_en', type: 'date' }, { field: 'recibido_hora' }],
    width: '150px',
  },
  {
    field: 'origen',
    headerKey: `${I18N}.columns.origen`,
    type: 'enum',
    enumKeyPrefix: `${I18N}.origenes`,
    width: '110px',
  },
  { field: 'envelope_from', headerKey: `${I18N}.columns.remitente`, type: 'text', width: '220px' },
  { field: 'asunto', headerKey: `${I18N}.columns.asunto`, type: 'text' },
  {
    field: 'estado',
    headerKey: `${I18N}.columns.estado`,
    type: 'enum',
    enumKeyPrefix: `${I18N}.estados`,
    width: '170px',
    toneFor: (row) => {
      const estado = (row as CorreoRecibidoRow).estado;
      if (estado === 'procesado') return 'positive';
      if (estado === 'error') return 'critical';
      return null;
    },
  },
  { field: 'error_detalle', headerKey: `${I18N}.columns.detalle`, type: 'text' },
  {
    field: 'documentos_count',
    headerKey: `${I18N}.columns.documentos`,
    type: 'number',
    width: '100px',
    align: 'right',
    cellAction: CELL_ACTION_DOCUMENTOS,
    cellActionLabelKey: `${I18N}.verDocumentos`,
  },
];
