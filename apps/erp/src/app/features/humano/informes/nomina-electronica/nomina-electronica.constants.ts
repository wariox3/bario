import type { ColumnDef, FilterField } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';

const I18N = 'entities.nominaElectronicaInforme';

export const NOMINA_ELECTRONICA_INFORME_FILTERS_STORAGE_KEY =
  'nomina-electronica-informe:filters:v1';

/**
 * Columnas del informe: identificación del documento (número, fecha, empleado,
 * contrato), la liquidación resumida y los tres estados.
 *
 * Solo `id`, `numero`, `fecha` y `contrato_id` son ordenables: el resto son
 * campos de relación o calculados que el informe original tampoco dejaba
 * ordenar. Se omite la columna del FK crudo del contacto, redundante con la
 * identificación y el nombre que van al lado.
 */
export const NOMINA_ELECTRONICA_INFORME_COLUMNS: readonly ColumnDef[] = [
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
    field: 'fecha',
    headerKey: `${I18N}.columns.fecha`,
    type: 'date',
    width: '110px',
    sortable: true,
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
    field: 'contrato_id',
    headerKey: `${I18N}.columns.contrato`,
    type: 'number',
    width: '90px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'salario',
    headerKey: `${I18N}.columns.salario`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'base_cotizacion',
    headerKey: `${I18N}.columns.baseCotizacion`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'base_prestacion',
    headerKey: `${I18N}.columns.basePrestacion`,
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
  {
    field: 'estado_electronico',
    headerKey: `${I18N}.columns.electronico`,
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Campos por los que se puede filtrar. Los del empleado usan el lookup de
 * Django (`contacto__…`) aunque la tabla los muestre aplanados: el filtro viaja
 * al ORM, la columna viene del serializador.
 *
 * Los tres estados no estaban en la lista de filtros del informe original pero
 * sí declarados como filtrables en su mapeo; acá se exponen, que es lo que uno
 * quiere de un informe de emisión electrónica ("cuáles faltan por emitir").
 */
export const NOMINA_ELECTRONICA_INFORME_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: `${I18N}.columns.id`, type: 'number' },
  { name: 'numero', displayNameKey: `${I18N}.columns.numero`, type: 'number' },
  { name: 'fecha', displayNameKey: `${I18N}.columns.fecha`, type: 'date' },
  { name: 'fecha_hasta', displayNameKey: `${I18N}.filters.fechaHasta`, type: 'date' },
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
  { name: 'estado_electronico', displayNameKey: `${I18N}.filters.electronico`, type: 'boolean' },
];

/** Acción de exportar, en el dropdown del toolbar. */
export const NOMINA_ELECTRONICA_INFORME_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
