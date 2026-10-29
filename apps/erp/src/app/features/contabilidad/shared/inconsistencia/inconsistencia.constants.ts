import type { ColumnDef } from '@reddoc/core';
import type { RowAction } from '@reddoc/feature-base';
import type { InconsistenciaGuardada } from './inconsistencia.model';

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

export const ACCION_RESOLVER = 'resolver';

/**
 * Resolver va a la vista, no al menú: es lo único que se hace con una fila, y
 * solo aparece en las que el backend sabe corregir solo. La usan la utilidad y
 * el modal del master de periodos.
 */
export const ROW_ACTIONS: readonly RowAction[] = [
  {
    id: ACCION_RESOLVER,
    labelKey: `${I18N}.resolver.accion`,
    iconClass: 'pi pi-wrench',
    inline: true,
    visibleFor: (row) => (row as InconsistenciaGuardada).inconsistencia_tipo_resolver_automatico,
  },
];
