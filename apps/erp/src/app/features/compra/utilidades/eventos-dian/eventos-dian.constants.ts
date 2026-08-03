import type { ColumnDef, FilterCondition, FilterField, SortSpec } from '@reddoc/core';
import type { RowAction } from '@reddoc/feature-base';
import type { EventosDianViewRow } from './eventos-dian.model';

/**
 * Constantes de la utilidad **Eventos DIAN** (Compra).
 *
 * Declara filtros permanentes, orden por defecto, columnas (incluidos los tres
 * estados de evento como `enum` de texto), campos filtrables, las acciones de
 * fila (condicionadas por `visibleFor`) y la storage key de filtros.
 */

const I18N = 'entities.eventosDian';

/** Tipo de documento de los eventos de compra (factura electrónica recibida). */
const DOCUMENTO_TIPO_EVENTO_COMPRA = 5;

/** Serializador que expande el estado de los tres eventos DIAN. */
export const EVENTO_COMPRA_SERIALIZADOR = 'evento_compra';

/**
 * Documentos de eventos de compra aprobados, sin evento electrónico emitido, no
 * descartados y no anulados. Espejo de `filtroPermanenteLista` del legacy.
 */
export const BASE_FILTERS: readonly FilterCondition[] = [
  { field: 'documento_tipo_id', operator: 'eq', value: DOCUMENTO_TIPO_EVENTO_COMPRA },
  { field: 'estado_aprobado', operator: 'eq', value: true },
  { field: 'estado_electronico_evento', operator: 'eq', value: false },
  { field: 'estado_electronico_descartado', operator: 'eq', value: false },
  { field: 'estado_anulado', operator: 'eq', value: false },
];

/** Orden inicial del legacy: `estado_aprobado -fecha -numero -id`. */
export const DEFAULT_SORT: readonly SortSpec[] = [
  { field: 'estado_aprobado', direction: 'asc' },
  { field: 'fecha', direction: 'desc' },
  { field: 'numero', direction: 'desc' },
  { field: 'id', direction: 'desc' },
];

/** Columnas: datos del documento/proveedor, referencia, y los tres estados de evento. */
export const COLUMNS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${I18N}.columns.id`, type: 'number', width: '70px', align: 'right' },
  { field: 'numero', headerKey: `${I18N}.columns.numero`, type: 'text', width: '100px' },
  { field: 'fecha', headerKey: `${I18N}.columns.fecha`, type: 'date', width: '110px' },
  {
    field: 'contacto',
    headerKey: `${I18N}.columns.codigo`,
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'contacto__numero_identificacion',
    headerKey: `${I18N}.columns.identificacion`,
    type: 'text',
    width: '130px',
  },
  { field: 'contacto__nombre_corto', headerKey: `${I18N}.columns.proveedor`, type: 'text' },
  {
    field: 'referencia_prefijo',
    headerKey: `${I18N}.columns.referenciaPrefijo`,
    type: 'text',
    width: '100px',
  },
  {
    field: 'referencia_numero',
    headerKey: `${I18N}.columns.referenciaNumero`,
    type: 'number',
    width: '110px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: `${I18N}.columns.total`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'estado_electronico',
    headerKey: `${I18N}.columns.electronico`,
    type: 'boolean',
    width: '100px',
    align: 'center',
  },
  {
    field: 'evento_documento_estado',
    headerKey: `${I18N}.columns.documento`,
    type: 'enum',
    width: '120px',
    align: 'center',
    enumKeyPrefix: `${I18N}.eventoEstado`,
  },
  {
    field: 'evento_recepcion_estado',
    headerKey: `${I18N}.columns.recepcion`,
    type: 'enum',
    width: '120px',
    align: 'center',
    enumKeyPrefix: `${I18N}.eventoEstado`,
  },
  {
    field: 'evento_aceptacion_estado',
    headerKey: `${I18N}.columns.aceptacion`,
    type: 'enum',
    width: '120px',
    align: 'center',
    enumKeyPrefix: `${I18N}.eventoEstado`,
  },
];

/** Filtros del usuario (port de `EVENTOS_DIAN_FILTERS`). */
export const FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: `${I18N}.columns.id`, type: 'number' },
  { name: 'numero', displayNameKey: `${I18N}.columns.numero`, type: 'string' },
];

// ── Acciones de fila ──────────────────────────────────────────────────────────
// Los ids los discrimina el componente; `visibleFor` replica la lógica
// condicional del legacy (por estado electrónico y estado de cada evento).

export const ROW_ACTION_EDITAR = 'editar';
export const ROW_ACTION_EMITIR = 'emitir';
export const ROW_ACTION_GESTIONAR = 'gestionar';
export const ROW_ACTION_DESCARTAR = 'descartar';

const asRow = (row: unknown) => row as EventosDianViewRow;

/** `true` si algún evento del documento está pendiente (`PE`). */
export function tieneEventoPendiente(row: EventosDianViewRow): boolean {
  return (
    row.evento_documento === 'PE' || row.evento_recepcion === 'PE' || row.evento_aceptacion === 'PE'
  );
}

export const ROW_ACTIONS: readonly RowAction[] = [
  {
    id: ROW_ACTION_EDITAR,
    labelKey: `${I18N}.actions.editar`,
    iconClass: 'pi pi-pencil',
    inline: true,
    visibleFor: (row) => !asRow(row).estado_electronico,
  },
  {
    id: ROW_ACTION_EMITIR,
    labelKey: `${I18N}.actions.emitir`,
    iconClass: 'pi pi-send',
    visibleFor: (row) => !asRow(row).estado_electronico,
  },
  {
    id: ROW_ACTION_GESTIONAR,
    labelKey: `${I18N}.actions.gestionar`,
    iconClass: 'pi pi-check-circle',
    visibleFor: (row) => asRow(row).estado_electronico && tieneEventoPendiente(asRow(row)),
  },
  {
    id: ROW_ACTION_DESCARTAR,
    labelKey: `${I18N}.actions.descartar`,
    iconClass: 'pi pi-ban',
    severity: 'danger',
    visibleFor: (row) =>
      !asRow(row).estado_electronico ||
      (asRow(row).estado_electronico && asRow(row).evento_documento === 'PE'),
  },
];

export const FILTERS_STORAGE_KEY = 'compra:eventos-dian:filters:v1';
