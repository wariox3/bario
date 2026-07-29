import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const CONCILIACIONES_FILTERS_STORAGE_KEY = 'conciliaciones:filters:v1';

/** Segmentos de ruta del listado, relativos al tenant. */
export const CONCILIACION_LIST_PATH = ['contabilidad', 'utilidades', 'conciliacion'] as const;

/** Filas por página de las dos tablas hijas (libro y extracto). */
export const CONCILIACION_TAB_PAGE_SIZE = 25;

/**
 * Catálogo de cuentas bancarias de la cabecera.
 *
 * ⚠️ Endpoint **supuesto**: el legacy usa `general/cuenta_banco/seleccionar/`
 * (con guion bajo). Acá se usa la forma con guion, que es la del resto del ERP y
 * la que ya consume el pago (`CUENTA_BANCO_ENDPOINT` de cartera). Si el backend
 * solo expone la del legacy, el select llega vacío y el fix es esta cadena.
 */
export const CUENTA_BANCO_ENDPOINT = '/general/cuenta-banco/seleccionar/';

// ── Listado de conciliaciones ───────────────────────────────────────────────

export const CONCILIACIONES_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.conciliacion.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'fecha_desde',
    headerKey: 'entities.conciliacion.columns.fechaDesde',
    type: 'date',
    width: '140px',
  },
  {
    field: 'fecha_hasta',
    headerKey: 'entities.conciliacion.columns.fechaHasta',
    type: 'date',
    width: '140px',
  },
  {
    field: 'cuenta_banco__nombre',
    headerKey: 'entities.conciliacion.columns.cuentaBanco',
    type: 'text',
  },
];

export const CONCILIACIONES_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.conciliacion.columns.id', type: 'number' },
  {
    name: 'fecha_desde',
    displayNameKey: 'entities.conciliacion.columns.fechaDesde',
    type: 'date',
  },
  {
    name: 'fecha_hasta',
    displayNameKey: 'entities.conciliacion.columns.fechaHasta',
    type: 'date',
  },
  {
    name: 'cuenta_banco__nombre',
    displayNameKey: 'entities.conciliacion.columns.cuentaBanco',
    type: 'string',
  },
];

export const CONCILIACIONES_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const CONCILIACIONES_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  { id: 'new', labelKey: 'common.actions.new', iconClass: 'pi pi-plus' },
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];

// ── Tabla del libro (conciliacion_detalle) ──────────────────────────────────

export const CONCILIACION_DETALLE_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.conciliacion.detalleColumns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'documento__documento_tipo__nombre',
    headerKey: 'entities.conciliacion.detalleColumns.tipo',
    type: 'text',
    width: '150px',
  },
  {
    field: 'documento__numero',
    headerKey: 'entities.conciliacion.detalleColumns.numero',
    type: 'text',
    width: '110px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.conciliacion.detalleColumns.fecha',
    type: 'date',
    width: '120px',
  },
  {
    field: 'cuenta__codigo',
    headerKey: 'entities.conciliacion.detalleColumns.cuenta',
    type: 'text',
    width: '110px',
  },
  {
    field: 'debito',
    headerKey: 'entities.conciliacion.detalleColumns.debito',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'credito',
    headerKey: 'entities.conciliacion.detalleColumns.credito',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  { field: 'detalle', headerKey: 'entities.conciliacion.detalleColumns.detalle', type: 'text' },
  {
    field: 'estado_conciliado',
    headerKey: 'entities.conciliacion.detalleColumns.conciliado',
    type: 'boolean',
    width: '110px',
    align: 'center',
  },
];

// ── Tabla del extracto (conciliacion_soporte) ───────────────────────────────

export const CONCILIACION_SOPORTE_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.conciliacion.soporteColumns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'fecha',
    headerKey: 'entities.conciliacion.soporteColumns.fecha',
    type: 'date',
    width: '120px',
  },
  {
    field: 'debito',
    headerKey: 'entities.conciliacion.soporteColumns.debito',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'credito',
    headerKey: 'entities.conciliacion.soporteColumns.credito',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  { field: 'detalle', headerKey: 'entities.conciliacion.soporteColumns.detalle', type: 'text' },
  {
    field: 'estado_conciliado',
    headerKey: 'entities.conciliacion.soporteColumns.conciliado',
    type: 'boolean',
    width: '110px',
    align: 'center',
  },
];

/**
 * Filtro de las dos tablas hijas: el estado de conciliación, que es lo único que
 * el ERP anterior ofrecía filtrar (y lo único que se busca — "muéstrame lo que
 * no cuadró").
 */
export const CONCILIACION_ESTADO_FILTER_FIELDS: readonly FilterField[] = [
  {
    name: 'estado_conciliado',
    displayNameKey: 'entities.conciliacion.detalleColumns.conciliado',
    type: 'boolean',
  },
];
