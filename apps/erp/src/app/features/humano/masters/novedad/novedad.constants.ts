import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

/**
 * `v2`: los filtros guardados con `v1` usaban nombres del serializer que el
 * `lista/` rechaza con 400.
 */
export const NOVEDADES_FILTERS_STORAGE_KEY = 'novedades:filters:v2';
export const NOVEDADES_QUICK_SEARCH_FIELD = 'contrato__contacto__nombre_corto';

/** Segmentos de ruta del listado, relativos al tenant. */
export const NOVEDAD_LIST_PATH = ['humano', 'novedades'] as const;

// El endpoint del selector de tipo de novedad es cross-form (novedad + turno);
// vive en `SELECT_ENDPOINTS.novedadTipo` (`@reddoc/core`).
/** Endpoint del selector de novedad de referencia (filtrado por contrato + tipo). */
export const NOVEDAD_REFERENCIA_ENDPOINT = '/humano/novedad/seleccionar/';

/**
 * Ids del catálogo `novedad_tipo` que disparan lógica condicional en el formulario.
 *
 * ⚠️ Acoplados al catálogo global del backend (igual que `CONTRATO_TIPO_INDEFINIDO_ID`).
 * Centralizados acá para que un cambio sea de una sola línea. Si el backend llegara
 * a exponer un código semántico estable, reemplazar el discriminador en `novedad.rules`.
 */
export const NOVEDAD_TIPO_VACACIONES_ID = 7;
export const NOVEDAD_TIPO_REFERENCIA_ID = 1;

/**
 * Nombres de los parámetros de filtro del selector de novedad de referencia.
 *
 * TODO(backend): `GET /humano/novedad/seleccionar/` hoy solo acepta `page` y
 * `search` (OpenAPI del 2026-11-03), así que **ignora** estos dos y devuelve
 * todas las novedades del tenant. Se mandan igual, con `_id` como todo filtro
 * por FK, para que el filtro entre solo cuando el backend los declare.
 */
export const NOVEDAD_REFERENCIA_CONTRATO_PARAM = 'contrato_id';
export const NOVEDAD_REFERENCIA_TIPO_PARAM = 'novedad_tipo_id';

/** Largo máximo del detalle: `HumNovedadRequest.detalle.maxLength`. */
export const NOVEDAD_DETALLE_MAX_LENGTH = 150;

export const NOVEDADES_COLUMNS: readonly ColumnDef[] = [
  // El orden es el del ERP anterior: qué novedad, de qué tipo, de quién y
  // cuándo. Los identificadores abren la fila porque son lo que distingue dos
  // novedades del mismo empleado.
  {
    field: 'id',
    headerKey: 'entities.novedad.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'novedad_tipo_nombre',
    headerKey: 'entities.novedad.columns.novedadTipo',
    type: 'text',
  },
  {
    field: 'contrato_contacto_id',
    headerKey: 'entities.novedad.columns.codigo',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'contrato_contacto_numero_identificacion',
    headerKey: 'entities.novedad.columns.identificacion',
    type: 'text',
    width: '130px',
  },
  {
    field: 'contrato_nombre',
    headerKey: 'entities.novedad.columns.nombre',
    type: 'text',
  },
  {
    field: 'contrato',
    headerKey: 'entities.novedad.columns.contratoId',
    type: 'number',
    width: '75px',
    align: 'right',
  },
  {
    field: 'fecha_desde',
    headerKey: 'entities.novedad.columns.fechaDesde',
    type: 'date',
    width: '110px',
  },
  {
    field: 'fecha_hasta',
    headerKey: 'entities.novedad.columns.fechaHasta',
    type: 'date',
    width: '110px',
  },
  {
    field: 'dias',
    headerKey: 'entities.novedad.columns.dias',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.novedad.columns.total',
    type: 'currency',
    align: 'right',
  },
];

/**
 * La `propiedad` va como ruta ORM y tiene que estar en `campos_filtrables` del
 * backend: los nombres del serializer (`contrato_nombre`) dan 400. El tipo solo se filtra
 * por `novedad_tipo_id` (falta `novedad_tipo__nombre`) y por eso no se ofrece.
 */
export const NOVEDADES_FILTER_FIELDS: readonly FilterField[] = [
  {
    name: 'contrato__contacto__nombre_corto',
    displayNameKey: 'entities.novedad.columns.nombre',
    type: 'string',
  },
  {
    name: 'contrato__contacto__numero_identificacion',
    displayNameKey: 'entities.novedad.columns.identificacion',
    type: 'string',
  },
  { name: 'fecha_desde', displayNameKey: 'entities.novedad.columns.fechaDesde', type: 'date' },
  { name: 'fecha_hasta', displayNameKey: 'entities.novedad.columns.fechaHasta', type: 'date' },
];

/** Aprobada ya no se edita ni se borra: el backend respondería 400. */
const noAprobada = (row: unknown): boolean =>
  !(row as { estado_aprobado: boolean }).estado_aprobado;

export const NOVEDADES_ROW_ACTIONS: readonly RowAction[] = [
  {
    id: 'edit',
    labelKey: 'common.actions.edit',
    iconClass: 'pi pi-pencil',
    inline: true,
    visibleFor: noAprobada,
  },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  {
    id: 'delete',
    labelKey: 'common.actions.delete',
    iconClass: 'pi pi-trash',
    severity: 'danger',
    visibleFor: noAprobada,
  },
];

/** Tampoco se selecciona para el borrado masivo. */
export const NOVEDADES_SELECTABLE_FOR = noAprobada;

export const NOVEDADES_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const NOVEDADES_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
