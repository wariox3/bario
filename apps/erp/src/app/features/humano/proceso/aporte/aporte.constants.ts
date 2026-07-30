import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';
import type { AporteCotizaciones } from './aporte.model';

export const APORTES_FILTERS_STORAGE_KEY = 'aportes:filters:v1';

/** Segmentos de ruta del listado, relativos al tenant. */
export const APORTE_LIST_PATH = ['humano', 'proceso', 'aporte'] as const;

/** Filas por página de las tablas de contratos y de líneas del workspace. */
export const APORTE_CONTRATOS_PAGE_SIZE = 25;
export const APORTE_DETALLES_PAGE_SIZE = 25;

/**
 * Catálogos de la cabecera.
 *
 * `entidad` es el mismo endpoint para los tres campos: lo que cambia es la
 * bandera que filtra el catálogo (una entidad de riesgos no sirve como caja de
 * compensación). Van como `params` de `<lib-api-select>`.
 */
export const SUCURSAL_ENDPOINT = '/humano/sucursal/seleccionar/';
export const ENTIDAD_ENDPOINT = '/humano/entidad/seleccionar/';
export const ENTIDAD_RIESGO_PARAMS = { riesgo: 'True' } as const;
export const ENTIDAD_SENA_PARAMS = { sena: 'True' } as const;
export const ENTIDAD_ICBF_PARAMS = { icbf: 'True' } as const;

// ── Listado ─────────────────────────────────────────────────────────────────

/**
 * Columnas del listado, en el orden del ERP anterior: identificación y periodo,
 * alcance, los contadores del proceso, el total y las dos banderas de estado.
 */
export const APORTES_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.aporte.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'anio',
    headerKey: 'entities.aporte.columns.anio',
    type: 'number',
    width: '90px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'mes',
    headerKey: 'entities.aporte.columns.mes',
    type: 'number',
    width: '80px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'sucursal_nombre',
    headerKey: 'entities.aporte.columns.sucursal',
    type: 'text',
    sortable: true,
  },
  {
    field: 'empleados',
    headerKey: 'entities.aporte.columns.empleados',
    type: 'number',
    width: '110px',
    align: 'right',
  },
  {
    field: 'contratos',
    headerKey: 'entities.aporte.columns.contratos',
    type: 'number',
    width: '110px',
    align: 'right',
  },
  {
    field: 'lineas',
    headerKey: 'entities.aporte.columns.lineas',
    type: 'number',
    width: '90px',
    align: 'right',
  },
  {
    field: 'cotizacion_total',
    headerKey: 'entities.aporte.columns.cotizacionTotal',
    type: 'currency',
    width: '160px',
    align: 'right',
  },
  {
    field: 'estado_generado',
    headerKey: 'entities.aporte.columns.generado',
    type: 'boolean',
    width: '80px',
    align: 'center',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.aporte.columns.aprobado',
    type: 'boolean',
    width: '80px',
    align: 'center',
  },
];

export const APORTES_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.aporte.columns.id', type: 'number' },
  { name: 'anio', displayNameKey: 'entities.aporte.columns.anio', type: 'number' },
  { name: 'mes', displayNameKey: 'entities.aporte.columns.mes', type: 'number' },
  {
    name: 'sucursal__nombre',
    displayNameKey: 'entities.aporte.columns.sucursal',
    type: 'string',
  },
  {
    name: 'estado_generado',
    displayNameKey: 'entities.aporte.columns.generado',
    type: 'boolean',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.aporte.columns.aprobado',
    type: 'boolean',
  },
];

/**
 * Acciones de fila. **No incluye eliminar**: borrar un aporte depende de su
 * estado (`capacidadesDe(...).puedeEliminar`) y la tabla compartida no condiciona
 * acciones por fila. El borrado vive en el workspace, donde la capacidad se
 * evalúa contra el aporte abierto.
 */
export const APORTES_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
];

export const APORTES_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const APORTES_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];

// ── Resumen de la cabecera ──────────────────────────────────────────────────

export interface CotizacionMeta {
  readonly clave: keyof AporteCotizaciones;
  readonly labelKey: string;
}

/**
 * Los diez acumulados de cotización, en el orden en que se muestran, más el
 * total aparte.
 *
 * Van como datos para que el resumen los recorra en bucle: el ERP anterior
 * repetía once bloques de tabla idénticos a mano.
 */
export const APORTE_COTIZACIONES: readonly CotizacionMeta[] = [
  { clave: 'cotizacion_pension', labelKey: 'entities.aporte.cotizaciones.pension' },
  {
    clave: 'cotizacion_solidaridad_solidaridad',
    labelKey: 'entities.aporte.cotizaciones.solidaridad',
  },
  {
    clave: 'cotizacion_solidaridad_subsistencia',
    labelKey: 'entities.aporte.cotizaciones.subsistencia',
  },
  {
    clave: 'cotizacion_voluntario_pension_afiliado',
    labelKey: 'entities.aporte.cotizaciones.voluntarioAfiliado',
  },
  {
    clave: 'cotizacion_voluntario_pension_aportante',
    labelKey: 'entities.aporte.cotizaciones.voluntarioAportante',
  },
  { clave: 'cotizacion_salud', labelKey: 'entities.aporte.cotizaciones.salud' },
  { clave: 'cotizacion_riesgos', labelKey: 'entities.aporte.cotizaciones.riesgos' },
  { clave: 'cotizacion_caja', labelKey: 'entities.aporte.cotizaciones.caja' },
  { clave: 'cotizacion_sena', labelKey: 'entities.aporte.cotizaciones.sena' },
  { clave: 'cotizacion_icbf', labelKey: 'entities.aporte.cotizaciones.icbf' },
];

// ── Pestaña de contratos ────────────────────────────────────────────────────

/**
 * Columnas de los contratos incluidos.
 *
 * La columna `novedad` es un **dato derivado** (ver `aporte.contratos.ts`), no un
 * campo del backend: reemplaza el semáforo de colores sobre las celdas de fecha
 * que usa el ERP anterior, que es un color sin etiqueta.
 */
export const APORTE_CONTRATO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.aporte.contratos.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'contrato__contacto_id',
    headerKey: 'entities.aporte.contratos.columns.codigo',
    type: 'number',
    width: '90px',
    align: 'right',
  },
  {
    field: 'contrato__contacto__numero_identificacion',
    headerKey: 'entities.aporte.contratos.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contrato__contacto__nombre_corto',
    headerKey: 'entities.aporte.contratos.columns.empleado',
    type: 'text',
  },
  {
    field: 'contrato',
    headerKey: 'entities.aporte.contratos.columns.contrato',
    type: 'number',
    width: '100px',
    align: 'right',
  },
  {
    field: 'fecha_desde',
    headerKey: 'entities.aporte.contratos.columns.desde',
    type: 'date',
    width: '120px',
  },
  {
    field: 'fecha_hasta',
    headerKey: 'entities.aporte.contratos.columns.hasta',
    type: 'date',
    width: '120px',
  },
  {
    field: 'novedad',
    headerKey: 'entities.aporte.contratos.columns.novedad',
    type: 'enum',
    enumKeyPrefix: 'entities.aporte.contratos.novedades',
    width: '160px',
  },
  {
    field: 'base_cotizacion',
    headerKey: 'entities.aporte.contratos.columns.baseCotizacion',
    type: 'currency',
    width: '150px',
    align: 'right',
  },
  {
    field: 'dias',
    headerKey: 'entities.aporte.contratos.columns.dias',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'salario',
    headerKey: 'entities.aporte.contratos.columns.salario',
    type: 'currency',
    width: '150px',
    align: 'right',
  },
];

export const APORTE_CONTRATO_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.aporte.contratos.columns.id', type: 'number' },
  {
    name: 'contrato__contacto__nombre_corto',
    displayNameKey: 'entities.aporte.contratos.columns.empleado',
    type: 'string',
  },
  {
    name: 'contrato__contacto_id',
    displayNameKey: 'entities.aporte.contratos.columns.codigo',
    type: 'number',
  },
];

export const APORTE_DETALLE_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.aporte.detalles.columns.id', type: 'number' },
  {
    name: 'aporte_contrato__contrato__contacto__nombre_corto',
    displayNameKey: 'entities.aporte.detalles.columns.empleado',
    type: 'string',
  },
  {
    name: 'aporte_contrato_id',
    displayNameKey: 'entities.aporte.detalles.columns.contrato',
    type: 'number',
  },
];
