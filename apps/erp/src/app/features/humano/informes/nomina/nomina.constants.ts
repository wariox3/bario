import type { ColumnDef, FilterField } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';

const I18N = 'entities.nominaInforme';

export const NOMINA_INFORME_FILTERS_STORAGE_KEY = 'nomina-informe:filters:v1';

/**
 * Columnas del informe: identificación del documento (número, periodo,
 * empleado), la liquidación resumida y los dos estados.
 *
 * Se omite la columna del FK crudo del contacto que traía el informe original,
 * redundante con la identificación y el nombre que van al lado.
 */
export const NOMINA_INFORME_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: `${I18N}.columns.id`,
    type: 'number',
    width: '70px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'numero',
    headerKey: `${I18N}.columns.numero`,
    type: 'text',
    width: '100px',
    sortable: true,
  },
  {
    // El serializador devuelve el inicio del periodo en `fecha`, no en
    // `fecha_desde` como la ficha del documento.
    field: 'fecha',
    headerKey: `${I18N}.columns.desde`,
    type: 'date',
    width: '110px',
    sortable: true,
  },
  {
    field: 'fecha_hasta',
    headerKey: `${I18N}.columns.hasta`,
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: `${I18N}.columns.identificacion`,
    type: 'text',
    width: '130px',
  },
  {
    field: 'contacto_nombre',
    headerKey: `${I18N}.columns.empleado`,
    type: 'text',
  },
  {
    field: 'salario',
    headerKey: `${I18N}.columns.salario`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'devengado',
    headerKey: `${I18N}.columns.devengado`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'deduccion',
    headerKey: `${I18N}.columns.deduccion`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: `${I18N}.columns.total`,
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: `${I18N}.columns.aprobado`,
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: `${I18N}.columns.anulado`,
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Campos por los que se puede filtrar. Los del empleado usan el lookup de
 * Django (`contacto__…`) aunque la tabla los muestre aplanados: el filtro viaja
 * al ORM, la columna viene del serializador.
 */
export const NOMINA_INFORME_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: `${I18N}.columns.id`, type: 'number' },
  { name: 'numero', displayNameKey: `${I18N}.columns.numero`, type: 'number' },
  { name: 'fecha', displayNameKey: `${I18N}.columns.desde`, type: 'date' },
  { name: 'fecha_hasta', displayNameKey: `${I18N}.columns.hasta`, type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: `${I18N}.filters.empleadoIdentificacion`,
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: `${I18N}.filters.empleadoNombre`,
    type: 'string',
  },
  { name: 'estado_aprobado', displayNameKey: `${I18N}.filters.aprobado`, type: 'boolean' },
  { name: 'estado_anulado', displayNameKey: `${I18N}.filters.anulado`, type: 'boolean' },
];

/** Acción de exportar, en el dropdown del toolbar. */
export const NOMINA_INFORME_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
