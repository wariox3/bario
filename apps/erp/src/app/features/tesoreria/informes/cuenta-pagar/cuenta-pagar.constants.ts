import type { ColumnDef, FilterField } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';

export const CUENTA_PAGAR_FILTERS_STORAGE_KEY = 'cuenta-pagar:filters:v2';

/**
 * Columnas del informe, en el orden del informe original: identificación del
 * documento (tipo, número, fecha, vencimiento), del contacto y los montos
 * (subtotal, impuesto, total, afectado, pendiente).
 *
 * La identificación del tercero va **antes** que su nombre, como en el resto de
 * los informes del ERP: es el dato por el que se lo busca.
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
    field: 'contacto_numero_identificacion',
    headerKey: 'entities.cuentaPagar.columns.identificacion',
    type: 'text',
    width: '130px',
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

/**
 * Campos por los que se puede filtrar: los del informe del ERP anterior
 * (documento por id, número, fecha y tipo; tercero por nombre e
 * identificación) más el id del tercero, que se conserva para quien llega con
 * él desde otra pantalla.
 *
 * El tipo de documento va por `documento_tipo_id` (convención de FK al
 * filtrar) y por `documento_tipo__nombre`; el número es texto, como en los
 * listados de documentos, para poder buscarlo con «contiene».
 */
export const CUENTA_PAGAR_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.cuentaPagar.columns.id', type: 'number' },
  { name: 'numero', displayNameKey: 'entities.cuentaPagar.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.cuentaPagar.columns.fecha', type: 'date' },
  {
    name: 'documento_tipo_id',
    displayNameKey: 'entities.cuentaPagar.columns.documentoTipoId',
    type: 'number',
  },
  {
    name: 'documento_tipo__nombre',
    displayNameKey: 'entities.cuentaPagar.columns.documentoTipo',
    type: 'string',
  },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.cuentaPagar.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.cuentaPagar.columns.contacto',
    type: 'string',
  },
  {
    name: 'contacto_id',
    displayNameKey: 'entities.cuentaPagar.columns.contactoId',
    type: 'number',
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
