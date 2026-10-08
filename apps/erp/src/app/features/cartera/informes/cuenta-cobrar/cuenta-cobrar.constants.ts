import type { ColumnDef, FilterField } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';

export const CUENTA_COBRAR_FILTERS_STORAGE_KEY = 'cuenta-cobrar:filters:v1';

/**
 * Columnas del informe, en el orden del informe original: identificación del
 * documento (tipo, número, fecha, vencimiento), del contacto y los montos
 * (subtotal, impuesto, total, afectado, pendiente).
 */
export const CUENTA_COBRAR_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.cuentaCobrar.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'documento_tipo_nombre',
    headerKey: 'entities.cuentaCobrar.columns.documentoTipo',
    type: 'text',
    width: '140px',
  },
  {
    field: 'numero',
    headerKey: 'entities.cuentaCobrar.columns.numero',
    type: 'text',
    width: '110px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.cuentaCobrar.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'fecha_vence',
    headerKey: 'entities.cuentaCobrar.columns.fechaVence',
    type: 'date',
    width: '110px',
  },
  {
    field: 'contacto_numero_identificacion',
    headerKey: 'entities.cuentaCobrar.columns.identificacion',
    type: 'text',
    width: '130px',
  },
  {
    field: 'contacto_nombre_corto',
    headerKey: 'entities.cuentaCobrar.columns.contacto',
    type: 'text',
  },
  {
    field: 'subtotal',
    headerKey: 'entities.cuentaCobrar.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'entities.cuentaCobrar.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.cuentaCobrar.columns.total',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'pago',
    headerKey: 'entities.cuentaCobrar.columns.pago',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'afectado',
    headerKey: 'entities.cuentaCobrar.columns.afectado',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'pendiente',
    headerKey: 'entities.cuentaCobrar.columns.pendiente',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
];

/**
 * Campos por los que se puede filtrar.
 *
 * Tres y nada más: el documento se busca por su **id** o su **número**, y el
 * tercero por su **id**. Se dejaron fuera fecha, tipo de documento y las
 * búsquedas por texto del contacto — quien usa este informe llega con el
 * documento o el tercero en la mano, no explorando.
 *
 * El tercero va por `contacto_id` y no por nombre: es la convención confirmada
 * para las FK en los filtros de informes, y evita depender de cómo esté escrito
 * el nombre.
 */
export const CUENTA_COBRAR_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.cuentaCobrar.columns.id', type: 'number' },
  { name: 'numero', displayNameKey: 'entities.cuentaCobrar.columns.numero', type: 'number' },
  {
    name: 'contacto_id',
    displayNameKey: 'entities.cuentaCobrar.columns.contactoId',
    type: 'number',
  },
];

/**
 * Acciones trailing del toolbar. Al ser un informe de solo lectura, el dropdown
 * "Acciones" solo ofrece descargar el Excel (sin nuevo/importar). Se mantiene el
 * grupo para seguir el estándar de los listados (ej. venta-item).
 */
export const CUENTA_COBRAR_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
