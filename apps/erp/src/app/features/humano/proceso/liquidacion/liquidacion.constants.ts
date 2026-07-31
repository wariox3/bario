import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';
import type { LiquidacionPrestaciones } from './liquidacion.model';

export const LIQUIDACIONES_FILTERS_STORAGE_KEY = 'liquidaciones:filters:v1';

/** Segmentos de ruta del listado, relativos al tenant. */
export const LIQUIDACION_LIST_PATH = ['humano', 'proceso', 'liquidacion'] as const;

/**
 * Catálogo de conceptos de los adicionales.
 *
 * `operacion` se agrega en el modal según lo que se esté cargando: acota la lista
 * a los conceptos que suman o a los que restan.
 */
export const CONCEPTO_ADICIONAL_ENDPOINT = '/humano/concepto/seleccionar/';
export const CONCEPTO_ADICIONAL_PARAMS = { adicional: 'True' } as const;

// ── Listado ─────────────────────────────────────────────────────────────────

/**
 * Columnas del listado, en el orden del ERP anterior: identificación del
 * contrato y el empleado, el periodo liquidado, el desglose de prestaciones y las
 * dos banderas de estado.
 */
export const LIQUIDACIONES_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.liquidacion.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'contrato_id',
    headerKey: 'entities.liquidacion.columns.contrato',
    type: 'number',
    width: '100px',
    align: 'right',
  },
  {
    field: 'contrato__contacto__numero_identificacion',
    headerKey: 'entities.liquidacion.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contrato__contacto__nombre_corto',
    headerKey: 'entities.liquidacion.columns.empleado',
    type: 'text',
  },
  {
    field: 'fecha_desde',
    headerKey: 'entities.liquidacion.columns.desde',
    type: 'date',
    width: '120px',
    sortable: true,
  },
  {
    field: 'fecha_hasta',
    headerKey: 'entities.liquidacion.columns.hasta',
    type: 'date',
    width: '120px',
    sortable: true,
  },
  {
    field: 'contrato__salario',
    headerKey: 'entities.liquidacion.columns.salario',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'dias',
    headerKey: 'entities.liquidacion.columns.dias',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'cesantia',
    headerKey: 'entities.liquidacion.columns.cesantia',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'interes',
    headerKey: 'entities.liquidacion.columns.interes',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'prima',
    headerKey: 'entities.liquidacion.columns.prima',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'vacacion',
    headerKey: 'entities.liquidacion.columns.vacacion',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'adicion',
    headerKey: 'entities.liquidacion.columns.adicion',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'deduccion',
    headerKey: 'entities.liquidacion.columns.deduccion',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.liquidacion.columns.total',
    type: 'currency',
    width: '150px',
    align: 'right',
  },
  {
    field: 'estado_generado',
    headerKey: 'entities.liquidacion.columns.generado',
    type: 'boolean',
    width: '80px',
    align: 'center',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.liquidacion.columns.aprobado',
    type: 'boolean',
    width: '80px',
    align: 'center',
  },
];

export const LIQUIDACIONES_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.liquidacion.columns.id', type: 'number' },
  {
    name: 'contrato__contacto__numero_identificacion',
    displayNameKey: 'entities.liquidacion.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contrato__contacto__nombre_corto',
    displayNameKey: 'entities.liquidacion.columns.empleado',
    type: 'string',
  },
  { name: 'contrato_id', displayNameKey: 'entities.liquidacion.columns.contrato', type: 'number' },
  { name: 'fecha_hasta', displayNameKey: 'entities.liquidacion.columns.hasta', type: 'date' },
  {
    name: 'estado_generado',
    displayNameKey: 'entities.liquidacion.columns.generado',
    type: 'boolean',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.liquidacion.columns.aprobado',
    type: 'boolean',
  },
];

/**
 * Acciones de fila. **Solo ver**: la liquidación no se edita —la calcula el
 * backend— y borrarla depende del estado, que `<lib-data-table>` no sabe evaluar
 * fila por fila. El borrado vive en el workspace.
 */
export const LIQUIDACIONES_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
];

/**
 * El listado **no tiene acción primaria**: una liquidación no se crea desde acá,
 * la fabrica el backend al terminar un contrato. Igual que en el ERP anterior,
 * donde la lista declara `verBotonNuevo: false`.
 */
export const LIQUIDACIONES_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];

// ── Resumen del workspace ───────────────────────────────────────────────────

export interface PrestacionMeta {
  readonly labelKey: string;
  /** Monto liquidado. */
  readonly valor: keyof LiquidacionPrestaciones;
  /** Días que se contaron. El interés no tiene: sale de la cesantía. */
  readonly dias?: keyof LiquidacionPrestaciones;
  /** Desde cuándo se contaron. */
  readonly ultimoPago?: keyof LiquidacionPrestaciones;
}

/**
 * Las cuatro prestaciones, con lo que cada una necesita para explicarse.
 *
 * Van como datos para que el resumen las recorra en bucle: el ERP anterior las
 * repartía en una tabla de ocho columnas donde media docena de celdas quedaban
 * vacías para cuadrar la grilla.
 */
export const LIQUIDACION_PRESTACIONES: readonly PrestacionMeta[] = [
  {
    labelKey: 'entities.liquidacion.prestaciones.cesantia',
    valor: 'cesantia',
    dias: 'dias_cesantia',
    ultimoPago: 'fecha_ultimo_pago_cesantia',
  },
  {
    // Sin días ni último pago propios: se calcula sobre la cesantía.
    labelKey: 'entities.liquidacion.prestaciones.interes',
    valor: 'interes',
  },
  {
    labelKey: 'entities.liquidacion.prestaciones.prima',
    valor: 'prima',
    dias: 'dias_prima',
    ultimoPago: 'fecha_ultimo_pago_prima',
  },
  {
    labelKey: 'entities.liquidacion.prestaciones.vacacion',
    valor: 'vacacion',
    dias: 'dias_vacacion',
    ultimoPago: 'fecha_ultimo_pago_vacacion',
  },
];

// ── Pestaña de adicionales ──────────────────────────────────────────────────

export const LIQUIDACION_ADICIONAL_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.liquidacion.adicionales.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'concepto',
    headerKey: 'entities.liquidacion.adicionales.columns.codigo',
    type: 'number',
    width: '90px',
    align: 'right',
  },
  {
    field: 'concepto__nombre',
    headerKey: 'entities.liquidacion.adicionales.columns.concepto',
    type: 'text',
  },
  {
    field: 'detalle',
    headerKey: 'entities.liquidacion.adicionales.columns.detalle',
    type: 'text',
  },
  {
    field: 'adicional',
    headerKey: 'entities.liquidacion.adicionales.columns.adicional',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'deduccion',
    headerKey: 'entities.liquidacion.adicionales.columns.deduccion',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
];
