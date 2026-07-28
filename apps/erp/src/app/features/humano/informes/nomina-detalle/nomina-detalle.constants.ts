import type { ColumnDef, FilterField } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';

const I18N = 'entities.nominaDetalleInforme';

export const NOMINA_DETALLE_INFORME_FILTERS_STORAGE_KEY = 'nomina-detalle-informe:filters:v1';

/**
 * Columnas del informe: identificación de la nómina que originó la línea
 * (documento, empleado, periodo) seguida del concepto liquidado y sus montos.
 *
 * Solo `id` es ordenable: el resto son campos de relación o calculados que el
 * informe original tampoco dejaba ordenar.
 */
export const NOMINA_DETALLE_INFORME_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: `${I18N}.columns.id`,
    type: 'number',
    width: '70px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'documento',
    headerKey: `${I18N}.columns.documento`,
    type: 'number',
    width: '100px',
    align: 'right',
  },
  {
    field: 'documento__numero',
    headerKey: `${I18N}.columns.numero`,
    type: 'text',
    width: '100px',
  },
  {
    field: 'documento__contacto__numero_identificacion',
    headerKey: `${I18N}.columns.identificacion`,
    type: 'text',
    width: '130px',
  },
  {
    field: 'documento__contacto__nombre_corto',
    headerKey: `${I18N}.columns.empleado`,
    type: 'text',
  },
  {
    field: 'documento__fecha',
    headerKey: `${I18N}.columns.fecha`,
    type: 'date',
    width: '110px',
  },
  {
    field: 'documento__fecha_desde',
    headerKey: `${I18N}.columns.fechaDesde`,
    type: 'date',
    width: '110px',
  },
  {
    field: 'documento__fecha_hasta',
    headerKey: `${I18N}.columns.fechaHasta`,
    type: 'date',
    width: '110px',
  },
  {
    field: 'detalle',
    headerKey: `${I18N}.columns.detalle`,
    type: 'text',
  },
  {
    field: 'porcentaje',
    headerKey: `${I18N}.columns.porcentaje`,
    type: 'number',
    width: '100px',
    align: 'right',
  },
  {
    field: 'dias',
    headerKey: `${I18N}.columns.dias`,
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'hora',
    headerKey: `${I18N}.columns.valorHora`,
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'operacion',
    headerKey: `${I18N}.columns.operacion`,
    type: 'enum',
    width: '110px',
    align: 'center',
    enumKeyPrefix: `${I18N}.operaciones`,
  },
  {
    field: 'pago_operado',
    headerKey: `${I18N}.columns.pago`,
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
    field: 'base_cotizacion',
    headerKey: `${I18N}.columns.baseCotizacion`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
];

/**
 * Campos por los que se puede filtrar. Todos apuntan al documento padre: la
 * línea por sí sola no tiene número, fecha ni empleado.
 *
 * El informe original declaraba `numero` y `fecha` sin el prefijo
 * `documento__`, campos que no existen en la línea; acá van corregidos.
 */
export const NOMINA_DETALLE_INFORME_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: `${I18N}.columns.id`, type: 'number' },
  { name: 'documento__numero', displayNameKey: `${I18N}.columns.numero`, type: 'number' },
  { name: 'documento__fecha', displayNameKey: `${I18N}.columns.fecha`, type: 'date' },
  { name: 'documento__fecha_desde', displayNameKey: `${I18N}.columns.fechaDesde`, type: 'date' },
  { name: 'documento__fecha_hasta', displayNameKey: `${I18N}.columns.fechaHasta`, type: 'date' },
  {
    name: 'documento__contacto__numero_identificacion',
    displayNameKey: `${I18N}.filters.empleadoIdentificacion`,
    type: 'string',
  },
  {
    name: 'documento__contacto__nombre_corto',
    displayNameKey: `${I18N}.filters.empleadoNombre`,
    type: 'string',
  },
];

/** Acción de exportar, en el dropdown del toolbar. */
export const NOMINA_DETALLE_INFORME_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
