import type { ColumnDef, FilterField } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';

export const PENDIENTE_FACTURAR_FILTERS_STORAGE_KEY = 'pendiente-facturar:filters:v1';

/**
 * Columnas del informe, en el orden pedido por negocio. Identifica el documento
 * y la línea (puesto, item, modalidad), las horas de cobertura y los montos
 * (IVA, valor, valor pendiente y total). Los encabezados respetan las
 * abreviaciones del negocio (Cód., Cant., H/HD/HN, Vr pendiente).
 *
 * Varios campos de monto y horas los calcula/expande el backend para el informe
 * (ver `pendiente-facturar.model.ts`); aquí solo se mapean por nombre.
 */
export const PENDIENTE_FACTURAR_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.pendienteFacturar.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'documento_numero',
    headerKey: 'entities.pendienteFacturar.columns.numero',
    type: 'text',
    width: '110px',
  },
  {
    field: 'documento_fecha',
    headerKey: 'entities.pendienteFacturar.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'puesto_id',
    headerKey: 'entities.pendienteFacturar.columns.cod',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  { field: 'puesto_nombre', headerKey: 'entities.pendienteFacturar.columns.puesto', type: 'text' },
  { field: 'item_nombre', headerKey: 'entities.pendienteFacturar.columns.item', type: 'text' },
  {
    field: 'modalidad_nombre',
    headerKey: 'entities.pendienteFacturar.columns.modalidad',
    type: 'text',
  },
  {
    field: 'cantidad',
    headerKey: 'entities.pendienteFacturar.columns.cantidad',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'horas',
    headerKey: 'entities.pendienteFacturar.columns.horas',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'horas_diurnas',
    headerKey: 'entities.pendienteFacturar.columns.horasDiurnas',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'horas_nocturnas',
    headerKey: 'entities.pendienteFacturar.columns.horasNocturnas',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'precio',
    headerKey: 'entities.pendienteFacturar.columns.valor',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.pendienteFacturar.columns.total',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'afectado',
    headerKey: 'entities.pendienteFacturar.columns.afectado',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'pendiente',
    headerKey: 'entities.pendienteFacturar.columns.valorPendiente',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
];

/** Campos por los que se puede filtrar (columnas descriptivas; no los montos calculados). */
export const PENDIENTE_FACTURAR_FILTER_FIELDS: readonly FilterField[] = [
  {
    name: 'documento_numero',
    displayNameKey: 'entities.pendienteFacturar.columns.numero',
    type: 'string',
  },
  {
    name: 'documento_fecha',
    displayNameKey: 'entities.pendienteFacturar.columns.fecha',
    type: 'date',
  },
  { name: 'puesto_id', displayNameKey: 'entities.pendienteFacturar.columns.cod', type: 'number' },
  {
    name: 'puesto_nombre',
    displayNameKey: 'entities.pendienteFacturar.columns.puesto',
    type: 'string',
  },
  {
    name: 'item_nombre',
    displayNameKey: 'entities.pendienteFacturar.columns.item',
    type: 'string',
  },
  {
    name: 'modalidad_nombre',
    displayNameKey: 'entities.pendienteFacturar.columns.modalidad',
    type: 'string',
  },
  {
    name: 'cantidad',
    displayNameKey: 'entities.pendienteFacturar.columns.cantidad',
    type: 'number',
  },
];

/**
 * Acciones trailing del toolbar. Al ser un informe de solo lectura, el dropdown
 * "Acciones" solo ofrece descargar el Excel (sin nuevo/importar). Se mantiene el
 * grupo para seguir el estándar de los listados (ej. contacto).
 */
export const PENDIENTE_FACTURAR_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
