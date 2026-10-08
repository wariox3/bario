import type { ColumnDef, FilterField, SortSpec } from '@reddoc/core';

/**
 * Campos filtrables del modal de **agregar documento**. Valen para las dos
 * familias —CxC y CxP—: filtran sobre `documento`, el mismo modelo en ambas.
 *
 * Los nombres son rutas del ORM y las FK se filtran por `_id` (convención del
 * `lista/`, opuesta a la de escritura). `pendiente` no se ofrece: el servicio ya
 * lo fija en `> 0` como filtro base y repetirlo choca condiciones en el body.
 */
export const AGREGAR_DOCUMENTO_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'documentAdd.filters.id', type: 'number' },
  { name: 'numero', displayNameKey: 'documentAdd.columns.numero', type: 'number' },
  { name: 'fecha', displayNameKey: 'documentAdd.columns.fecha', type: 'date' },
  { name: 'fecha_vence', displayNameKey: 'documentAdd.columns.fechaVence', type: 'date' },
  {
    name: 'documento_tipo_id',
    displayNameKey: 'documentAdd.filters.documentoTipoId',
    type: 'number',
  },
  { name: 'documento_tipo__nombre', displayNameKey: 'documentAdd.columns.tipo', type: 'string' },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'documentAdd.columns.contacto',
    type: 'string',
  },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'documentAdd.filters.identificacion',
    type: 'string',
  },
];

/**
 * Columnas de la tabla de documentos pendientes (solo lectura, selección
 * múltiple). La identificación del tercero va antes que su nombre, como en el
 * resto de los listados. De los montos solo van los tres que deciden un cruce:
 * cuánto es, cuánto se cruzó y cuánto queda.
 */
export const AGREGAR_DOCUMENTO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'documento_tipo_nombre',
    headerKey: 'documentAdd.columns.tipo',
    type: 'text',
    width: '11rem',
  },
  { field: 'numero', headerKey: 'documentAdd.columns.numero', type: 'number', width: '7rem' },
  { field: 'fecha', headerKey: 'documentAdd.columns.fecha', type: 'date', width: '8rem' },
  {
    field: 'fecha_vence',
    headerKey: 'documentAdd.columns.fechaVence',
    type: 'date',
    width: '8rem',
  },
  {
    field: 'contacto_numero_identificacion',
    headerKey: 'documentAdd.filters.identificacion',
    type: 'text',
    width: '9rem',
  },
  { field: 'contacto_nombre_corto', headerKey: 'documentAdd.columns.contacto', type: 'text' },
  {
    field: 'total',
    headerKey: 'documentAdd.columns.total',
    type: 'currency',
    align: 'right',
    width: '9rem',
  },
  {
    field: 'afectado',
    headerKey: 'documentAdd.columns.afectado',
    type: 'currency',
    align: 'right',
    width: '9rem',
  },
  {
    field: 'pendiente',
    headerKey: 'documentAdd.columns.pendiente',
    type: 'currency',
    align: 'right',
    width: '9rem',
  },
];

/** Orden por defecto: documentos más recientes primero. */
export const AGREGAR_DOCUMENTO_DEFAULT_SORT: readonly SortSpec[] = [
  { field: 'fecha', direction: 'desc' },
];
