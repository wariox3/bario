import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const PROGRAMACIONES_FILTERS_STORAGE_KEY = 'programaciones:filters:v1';

/** Segmentos de ruta del listado, relativos al tenant. */
export const PROGRAMACION_LIST_PATH = ['humano', 'proceso', 'programacion'] as const;

/** Filas por página de la tabla de renglones del workspace. */
export const PROGRAMACION_RENGLONES_PAGE_SIZE = 25;

/**
 * Catálogos de la cabecera.
 *
 * El legacy los nombra `humano/pago_tipo/seleccionar/` (con guion bajo); acá van
 * con **guion**, que es la convención de endpoints de este ERP.
 *
 * Ninguno está en `SELECT_ENDPOINTS` todavía: se suman ahí cuando un segundo
 * formulario los pida.
 */
export const PAGO_TIPO_ENDPOINT = '/humano/pago-tipo/seleccionar/';
export const GRUPO_ENDPOINT = '/humano/grupo/seleccionar/';

// ── Listado ─────────────────────────────────────────────────────────────────

/**
 * Columnas del listado, en el orden del ERP anterior: identificación del proceso
 * (id, nombre, tipo, grupo, periodo), su periodo liquidado, los acumulados y las
 * dos banderas de estado.
 */
export const PROGRAMACIONES_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.programacion.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'nombre',
    headerKey: 'entities.programacion.columns.nombre',
    type: 'text',
    sortable: true,
  },
  {
    field: 'pago_tipo_nombre',
    headerKey: 'entities.programacion.columns.pagoTipo',
    type: 'text',
    width: '140px',
    sortable: true,
  },
  {
    field: 'grupo_nombre',
    headerKey: 'entities.programacion.columns.grupo',
    type: 'text',
    width: '150px',
    sortable: true,
  },
  {
    field: 'periodo_nombre',
    headerKey: 'entities.programacion.columns.periodo',
    type: 'text',
    width: '140px',
    sortable: true,
  },
  {
    field: 'fecha_desde',
    headerKey: 'entities.programacion.columns.fechaDesde',
    type: 'date',
    width: '120px',
    sortable: true,
  },
  {
    field: 'fecha_hasta',
    headerKey: 'entities.programacion.columns.fechaHasta',
    type: 'date',
    width: '120px',
    sortable: true,
  },
  {
    field: 'dias',
    headerKey: 'entities.programacion.columns.dias',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'contratos',
    headerKey: 'entities.programacion.columns.contratos',
    type: 'number',
    width: '100px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.programacion.columns.total',
    type: 'currency',
    width: '150px',
    align: 'right',
  },
  {
    field: 'estado_generado',
    headerKey: 'entities.programacion.columns.generado',
    type: 'boolean',
    width: '80px',
    align: 'center',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.programacion.columns.aprobado',
    type: 'boolean',
    width: '80px',
    align: 'center',
  },
];

export const PROGRAMACIONES_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.programacion.columns.id', type: 'number' },
  { name: 'nombre', displayNameKey: 'entities.programacion.columns.nombre', type: 'string' },
  {
    name: 'pago_tipo__nombre',
    displayNameKey: 'entities.programacion.columns.pagoTipo',
    type: 'string',
  },
  {
    name: 'grupo__nombre',
    displayNameKey: 'entities.programacion.columns.grupo',
    type: 'string',
  },
  {
    name: 'periodo__nombre',
    displayNameKey: 'entities.programacion.columns.periodo',
    type: 'string',
  },
  {
    name: 'fecha_desde',
    displayNameKey: 'entities.programacion.columns.fechaDesde',
    type: 'date',
  },
  {
    name: 'fecha_hasta',
    displayNameKey: 'entities.programacion.columns.fechaHasta',
    type: 'date',
  },
  {
    name: 'estado_generado',
    displayNameKey: 'entities.programacion.columns.generado',
    type: 'boolean',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.programacion.columns.aprobado',
    type: 'boolean',
  },
];

/**
 * Acciones de fila. **No incluye eliminar**: borrar una programación depende de
 * su estado (`capacidadesDe(...).puedeEliminar`), y la tabla compartida no
 * condiciona acciones por fila. El borrado vive en el workspace, donde la
 * capacidad se evalúa contra la programación abierta.
 */
export const PROGRAMACIONES_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
];

export const PROGRAMACIONES_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const PROGRAMACIONES_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];

// ── Renglones del workspace ─────────────────────────────────────────────────

/**
 * Columnas comunes a las tres variantes: quién es el empleado y qué tramo del
 * contrato se liquidó.
 *
 * `fecha_desde` y `fecha_hasta` son las del **contrato dentro del periodo**, no
 * las de la programación: por eso el legacy las resalta cuando el contrato empezó
 * o terminó dentro del rango.
 */
const RENGLON_COLUMNS_IDENTIFICACION: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.programacion.renglones.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'contrato_contacto_numero_identificacion',
    headerKey: 'entities.programacion.renglones.columns.identificacion',
    type: 'text',
    width: '130px',
  },
  {
    field: 'contrato_contacto_nombre_corto',
    headerKey: 'entities.programacion.renglones.columns.empleado',
    type: 'text',
    width: '220px',
  },
  {
    field: 'contrato_id',
    headerKey: 'entities.programacion.renglones.columns.contrato',
    type: 'number',
    width: '100px',
    align: 'right',
  },
  {
    field: 'fecha_desde',
    headerKey: 'entities.programacion.renglones.columns.desde',
    type: 'date',
    width: '115px',
  },
  {
    field: 'fecha_hasta',
    headerKey: 'entities.programacion.renglones.columns.hasta',
    type: 'date',
    width: '115px',
  },
  {
    field: 'salario',
    headerKey: 'entities.programacion.renglones.columns.salario',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
];

/** Cierre común: el neto liquidado del renglón. */
const RENGLON_COLUMN_TOTAL: ColumnDef = {
  field: 'total',
  headerKey: 'entities.programacion.renglones.columns.total',
  type: 'currency',
  width: '140px',
  align: 'right',
};

/**
 * Las once clases de hora y recargo de la nómina del periodo.
 *
 * Van **abreviadas** (D, N, FD…) porque con 21 columnas los nombres completos no
 * caben; la tabla las explica con una leyenda encima. `ColumnDef` no tiene tooltip
 * —el legacy usaba uno por columna—, y agregarlo a la tabla compartida por este
 * caso sería mover el problema.
 */
const RENGLON_COLUMNS_HORAS: readonly ColumnDef[] = (
  [
    ['diurna', 'diurna'],
    ['nocturna', 'nocturna'],
    ['festiva_diurna', 'festivaDiurna'],
    ['festiva_nocturna', 'festivaNocturna'],
    ['extra_diurna', 'extraDiurna'],
    ['extra_nocturna', 'extraNocturna'],
    ['extra_festiva_diurna', 'extraFestivaDiurna'],
    ['extra_festiva_nocturna', 'extraFestivaNocturna'],
    ['recargo_nocturno', 'recargoNocturno'],
    ['recargo_festivo_diurno', 'recargoFestivoDiurno'],
    ['recargo_festivo_nocturno', 'recargoFestivoNocturno'],
  ] as const
).map(([field, clave]) => ({
  field,
  headerKey: `entities.programacion.renglones.horas.${clave}`,
  type: 'number' as const,
  width: '70px',
  align: 'right' as const,
}));

/** Nómina del periodo: días, transporte y las once clases de hora. */
export const RENGLON_COLUMNS_NOMINA: readonly ColumnDef[] = [
  ...RENGLON_COLUMNS_IDENTIFICACION,
  {
    field: 'dias_transporte',
    headerKey: 'entities.programacion.renglones.columns.diasTransporte',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'dias',
    headerKey: 'entities.programacion.renglones.columns.dias',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  ...RENGLON_COLUMNS_HORAS,
  RENGLON_COLUMN_TOTAL,
];

/** Prima: el salario promedio y los días, sin desglose de horas. */
export const RENGLON_COLUMNS_PRIMA: readonly ColumnDef[] = [
  ...RENGLON_COLUMNS_IDENTIFICACION,
  {
    field: 'salario_promedio',
    headerKey: 'entities.programacion.renglones.columns.promedio',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'dias',
    headerKey: 'entities.programacion.renglones.columns.dias',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  RENGLON_COLUMN_TOTAL,
];

// ── Adicionales del periodo ─────────────────────────────────────────────────

/**
 * Catálogo de conceptos que pueden ir como adicional.
 *
 * ⚠️ El filtro `adicional=True` viene del legacy: acota el catálogo a los
 * conceptos marcados como adicionales. Sin él saldrían todos los conceptos de
 * nómina, incluidos los que el sistema liquida solo.
 */
export const CONCEPTO_ADICIONAL_ENDPOINT = '/humano/concepto/seleccionar/';
export const CONCEPTO_ADICIONAL_PARAMS: Record<string, string> = { adicional: 'True' };

/**
 * Columnas de los adicionales dentro del workspace. Es un subconjunto de las del
 * master: acá la programación es implícita, así que su columna no aporta.
 */
export const ADICIONALES_PROGRAMACION_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.programacion.adicionales.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'contrato_nombre',
    headerKey: 'entities.programacion.adicionales.columns.empleado',
    type: 'text',
  },
  {
    field: 'concepto_nombre',
    headerKey: 'entities.programacion.adicionales.columns.concepto',
    type: 'text',
    width: '220px',
  },
  {
    field: 'valor',
    headerKey: 'entities.programacion.adicionales.columns.valor',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'horas',
    headerKey: 'entities.programacion.adicionales.columns.horas',
    type: 'number',
    width: '90px',
    align: 'right',
  },
  {
    field: 'detalle',
    headerKey: 'entities.programacion.adicionales.columns.detalle',
    type: 'text',
  },
  {
    field: 'aplica_dia_laborado',
    headerKey: 'entities.programacion.adicionales.columns.aplicaDiaLaborado',
    type: 'boolean',
    width: '110px',
    align: 'center',
  },
];

/** Cesantías e intereses: suman la base de prestación al set de la prima. */
export const RENGLON_COLUMNS_CESANTIA: readonly ColumnDef[] = [
  ...RENGLON_COLUMNS_IDENTIFICACION,
  {
    field: 'base_prestacion',
    headerKey: 'entities.programacion.renglones.columns.basePrestacion',
    type: 'currency',
    width: '150px',
    align: 'right',
  },
  {
    field: 'salario_promedio',
    headerKey: 'entities.programacion.renglones.columns.promedio',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'dias',
    headerKey: 'entities.programacion.renglones.columns.dias',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  RENGLON_COLUMN_TOTAL,
];
