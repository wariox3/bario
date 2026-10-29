import type { ColumnDef } from '@reddoc/core';

const I18N = 'entities.inconsistencias';

/** Columnas de una inconsistencia guardada: qué falla y dónde (comprobante, documento, cuenta). */
export const INCONSISTENCIA_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'inconsistencia_tipo_nombre',
    headerKey: `${I18N}.columns.tipo`,
    type: 'text',
    width: '180px',
  },
  { field: 'descripcion', headerKey: `${I18N}.columns.descripcion`, type: 'text' },
  {
    field: 'comprobante_nombre',
    headerKey: `${I18N}.columns.comprobante`,
    type: 'text',
    width: '170px',
  },
  { field: 'numero', headerKey: `${I18N}.columns.numero`, type: 'text', width: '100px' },
  {
    field: 'documento_documento_tipo_nombre',
    headerKey: `${I18N}.columns.documento`,
    type: 'text',
    width: '170px',
  },
  {
    field: 'movimiento_cuenta_codigo',
    headerKey: `${I18N}.columns.cuenta`,
    type: 'text',
    width: '120px',
  },
];
