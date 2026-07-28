import type { ColumnDef, FilterCondition, FilterField } from '@reddoc/core';
import { DOCUMENT_TYPE_ID } from '@reddoc/core';

/**
 * Constantes de la utilidad **Enviar nómina electrónica** (Humano).
 *
 * Declara los filtros permanentes, las columnas, los campos filtrables por el
 * usuario y la storage key de los filtros.
 */

const I18N = 'entities.enviarNominaElectronica';

/**
 * Nóminas electrónicas aprobadas, no anuladas, aún no enviadas a la DIAN y no
 * descartadas. Espejo de `filtroPermanenteEmitir` del legacy.
 *
 * Acá el discriminador es el **tipo** (`documento_tipo_id = 15`), no la clase
 * ni el grupo como en las utilidades de venta y compra: la nómina electrónica
 * es un solo tipo de documento.
 *
 * Se inyectan como `baseFilters` de `buildListBody`, antes de los del usuario;
 * nunca se muestran en la UI.
 */
export const BASE_FILTERS: readonly FilterCondition[] = [
  { field: 'estado_aprobado', operator: 'eq', value: true },
  { field: 'estado_anulado', operator: 'eq', value: false },
  { field: 'estado_electronico', operator: 'eq', value: false },
  { field: 'estado_electronico_descartado', operator: 'eq', value: false },
  { field: 'documento_tipo_id', operator: 'eq', value: DOCUMENT_TYPE_ID.NOMINA_ELECTRONICA },
];

/** Columnas del listado: identificación de la nómina + empleado + estado electrónico. */
export const COLUMNS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${I18N}.columns.id`, type: 'number', width: '70px', align: 'right' },
  { field: 'numero', headerKey: `${I18N}.columns.numero`, type: 'text', width: '110px' },
  { field: 'fecha', headerKey: `${I18N}.columns.fecha`, type: 'date', width: '110px' },
  { field: 'contacto_nombre', headerKey: `${I18N}.columns.empleado`, type: 'text' },
  {
    field: 'total',
    headerKey: `${I18N}.columns.total`,
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_electronico_estado',
    headerKey: `${I18N}.columns.estado`,
    type: 'enum',
    width: '160px',
    align: 'center',
    enumKeyPrefix: `${I18N}.estado`,
  },
];

/** Filtros del usuario (port de `ENVIAR_NOMINA_ELECTRONICA_FILTERS`). */
export const FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: `${I18N}.columns.id`, type: 'number' },
  { name: 'numero', displayNameKey: `${I18N}.columns.numero`, type: 'string' },
  {
    name: 'estado_electronico_notificado',
    displayNameKey: `${I18N}.filters.notificado`,
    type: 'boolean',
  },
  {
    name: 'estado_electronico_enviado',
    displayNameKey: `${I18N}.filters.enviado`,
    type: 'boolean',
  },
];

export const FILTERS_STORAGE_KEY = 'humano:enviar-nomina-electronica:filters:v1';
