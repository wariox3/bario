import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Columnas visibles del listado de Nómina.
 *
 * Subconjunto de `DocumentoListRowBase` más los campos de la familia humano:
 * el periodo liquidado (desde/hasta) en vez de una sola fecha, el empleado, y
 * el desglose devengado/deducción/total en vez del fiscal.
 */
export const NOMINA_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.nomina.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.nomina.columns.numero',
    type: 'text',
    width: '110px',
  },
  {
    field: 'fecha_desde',
    headerKey: 'entities.nomina.columns.desde',
    type: 'date',
    width: '110px',
  },
  {
    field: 'fecha_hasta',
    headerKey: 'entities.nomina.columns.hasta',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.nomina.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.nomina.columns.empleado',
    type: 'text',
  },
  {
    field: 'salario',
    headerKey: 'entities.nomina.columns.salario',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'devengado',
    headerKey: 'entities.nomina.columns.devengado',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'deduccion',
    headerKey: 'entities.nomina.columns.deduccion',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.nomina.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.nomina.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.nomina.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.nomina.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const NOMINA_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.nomina.columns.numero', type: 'string' },
  { name: 'fecha_desde', displayNameKey: 'entities.nomina.columns.desde', type: 'date' },
  { name: 'fecha_hasta', displayNameKey: 'entities.nomina.columns.hasta', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.nomina.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.nomina.columns.empleado',
    type: 'string',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.nomina.filters.aprobado',
    type: 'boolean',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.nomina.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.nomina.filters.contabilizado',
    type: 'boolean',
  },
];
