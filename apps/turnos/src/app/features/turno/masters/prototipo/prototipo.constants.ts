import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction } from '@reddoc/feature-base';

export const PROTOTIPOS_FILTERS_STORAGE_KEY = 'prototipos:filters:v1';

/** Segmentos de ruta del listado, relativos al tenant. */
export const PROTOTIPO_LIST_PATH = ['prototipos'] as const;

/**
 * Columnas visibles del administrador de prototipos. Se muestran los campos de
 * display que el backend ya devuelve resueltos (nombres de puesto/contrato/
 * secuencia y número de documento) para no pedir relaciones aparte.
 */
export const PROTOTIPOS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.prototipo.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'documento_numero',
    headerKey: 'entities.prototipo.columns.documento',
    type: 'number',
    width: '110px',
    align: 'right',
  },
  { field: 'puesto_nombre', headerKey: 'entities.prototipo.columns.puesto', type: 'text' },
  { field: 'contrato_nombre', headerKey: 'entities.prototipo.columns.contrato', type: 'text' },
  { field: 'secuencia_nombre', headerKey: 'entities.prototipo.columns.secuencia', type: 'text' },
  {
    field: 'fecha_inicio',
    headerKey: 'entities.prototipo.columns.fechaInicio',
    type: 'date',
    width: '140px',
  },
  {
    field: 'posicion',
    headerKey: 'entities.prototipo.columns.posicion',
    type: 'number',
    width: '100px',
    align: 'right',
  },
];

/**
 * Campos por los que se puede filtrar el listado. Solo campos numéricos propios
 * del prototipo (los `*_nombre` son display resueltos por el backend y no
 * necesariamente filtrables).
 */
export const PROTOTIPOS_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.prototipo.columns.id', type: 'number' },
  {
    name: 'documento_numero',
    displayNameKey: 'entities.prototipo.columns.documento',
    type: 'number',
  },
  { name: 'posicion', displayNameKey: 'entities.prototipo.columns.posicion', type: 'number' },
];

/** Solo ver el detalle: el master es de lectura (sin editar ni eliminar). */
export const PROTOTIPOS_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
];
