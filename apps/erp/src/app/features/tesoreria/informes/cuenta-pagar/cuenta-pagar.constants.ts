import type { ColumnDef, FilterField } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';

export const CUENTA_PAGAR_FILTERS_STORAGE_KEY = 'cuenta-pagar:filters:v1';

/**
 * Columnas del informe, en el orden del informe original: identificación del
 * documento (tipo, número, fecha, vencimiento), del contacto y los montos
 * (subtotal, impuesto, total, afectado, pendiente).
 *
 * Se replica el mismo set que el informe hermano de cuentas por cobrar. El
 * informe viejo de pagar además exponía `contacto_id` e identificación como
 * columnas visibles; se omiten aquí para mantener la pareja consistente.
 */
export const CUENTA_PAGAR_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.cuentaPagar.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'documento_tipo_nombre',
    headerKey: 'entities.cuentaPagar.columns.documentoTipo',
    type: 'text',
    width: '140px',
  },
  {
    field: 'numero',
    headerKey: 'entities.cuentaPagar.columns.numero',
    type: 'text',
    width: '110px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.cuentaPagar.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'fecha_vence',
    headerKey: 'entities.cuentaPagar.columns.fechaVence',
    type: 'date',
    width: '110px',
  },
  {
    field: 'contacto_nombre_corto',
    headerKey: 'entities.cuentaPagar.columns.contacto',
    type: 'text',
  },
  {
    field: 'subtotal',
    headerKey: 'entities.cuentaPagar.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'entities.cuentaPagar.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.cuentaPagar.columns.total',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'afectado',
    headerKey: 'entities.cuentaPagar.columns.afectado',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'pendiente',
    headerKey: 'entities.cuentaPagar.columns.pendiente',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
];

/** Campos por los que se puede filtrar (columnas descriptivas; no los montos calculados). */
export const CUENTA_PAGAR_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.cuentaPagar.columns.id', type: 'number' },
  { name: 'numero', displayNameKey: 'entities.cuentaPagar.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.cuentaPagar.columns.fecha', type: 'date' },
  {
    name: 'documento_tipo_id',
    displayNameKey: 'entities.cuentaPagar.columns.documentoTipo',
    type: 'number',
  },
  {
    name: 'documento_tipo_nombre',
    displayNameKey: 'entities.cuentaPagar.columns.documentoTipo',
    type: 'string',
  },
  {
    name: 'contacto_nombre_corto',
    displayNameKey: 'entities.cuentaPagar.columns.contacto',
    type: 'string',
  },
  {
    name: 'contacto_numero_identificacion',
    displayNameKey: 'entities.cuentaPagar.columns.identificacion',
    type: 'string',
  },
];

/**
 * Acciones trailing del toolbar. Al ser un informe de solo lectura, el dropdown
 * "Acciones" solo ofrece descargar el Excel (sin nuevo/importar). Se mantiene el
 * grupo para seguir el estándar de los listados (ej. cuenta-cobrar).
 */
export const CUENTA_PAGAR_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
