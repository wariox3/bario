import type { ColumnDef, FilterField, SortSpec } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';
import type { TurnoFila } from './turno.model';

/** Cajas activas para abrir un turno (las inactivas no se pueden elegir). */
export const CAJA_SELECT_ENDPOINT = '/venta/caja/seleccionar/';

/** Filtros del usuario en el listado de turnos, recordados en el dispositivo. */
export const TURNOS_FILTROS_STORAGE_KEY = 'pos:turnos:filtros:v1';

/** Los más recientes primero. */
export const TURNOS_ORDEN_DEFAULT: readonly SortSpec[] = [
  { field: 'fecha_apertura', direction: 'desc' },
  { field: 'id', direction: 'desc' },
];

const COL = 'turno.columns';

/**
 * Apertura y cierre van como texto ya formateado con hora (`apertura`/`cierre`
 * los arma el servicio): la columna de fecha solo pinta el día, y en un turno
 * la hora es el dato. Por eso no se ordenan desde la cabecera.
 */
export const TURNOS_COLUMNAS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${COL}.id`, type: 'number', width: '70px', align: 'right' },
  { field: 'caja_nombre', headerKey: `${COL}.caja`, type: 'text', sortable: false },
  { field: 'caja_sede_nombre', headerKey: `${COL}.sede`, type: 'text', sortable: false },
  { field: 'usuario_nombre_corto', headerKey: `${COL}.cajero`, type: 'text', sortable: false },
  {
    field: 'apertura',
    headerKey: `${COL}.apertura`,
    type: 'text',
    width: '140px',
    sortable: false,
  },
  { field: 'cierre', headerKey: `${COL}.cierre`, type: 'text', width: '140px', sortable: false },
  { field: 'base', headerKey: `${COL}.base`, type: 'currency', width: '130px', align: 'right' },
  {
    field: 'cantidad_documentos',
    headerKey: `${COL}.documentos`,
    type: 'number',
    width: '100px',
    align: 'right',
  },
  {
    field: 'total_venta',
    headerKey: `${COL}.totalVenta`,
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_cerrado',
    headerKey: `${COL}.estado`,
    type: 'boolean',
    booleanKeyPrefix: 'turno.estado',
    width: '100px',
    align: 'center',
  },
];

export const TURNOS_CAMPOS_FILTRO: readonly FilterField[] = [
  { name: 'id', displayNameKey: `${COL}.id`, type: 'number' },
  { name: 'fecha_apertura', displayNameKey: `${COL}.apertura`, type: 'date' },
  { name: 'estado_cerrado', displayNameKey: `${COL}.cerrado`, type: 'boolean' },
];

/** El turno se abre por su acción, no por un "Nuevo". */
export const TURNOS_ACCION_ABRIR: ToolbarAction = {
  id: 'abrir',
  labelKey: 'turno.abrir.accion',
  iconClass: 'pi pi-play',
};

/** Imprimir el cierre, solo en los turnos cerrados (los abiertos saldrían como pre-cierre). */
export const TURNOS_ACCIONES_FILA: readonly RowAction[] = [
  {
    id: 'imprimir',
    labelKey: 'turno.cerrado.imprimir',
    iconClass: 'pi pi-print',
    inline: true,
    visibleFor: (fila) => (fila as TurnoFila).estado_cerrado,
  },
];
