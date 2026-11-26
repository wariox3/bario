import type { EmitirDocumentoElectronicoConfig } from '@erp/core/documento-electronico';
import {
  BASE_FILTERS,
  COLUMNS,
  FILTERS_STORAGE_KEY,
  FILTER_FIELDS,
} from './enviar-nomina-electronica.constants';

/**
 * Humano → Enviar nómina electrónica: las nóminas electrónicas por emitir. Con
 * Descartar, que saca la nómina del ciclo para siempre. Las que esperan respuesta
 * también se marcan: reemitirlas consulta el veredicto de la DIAN.
 */
export const ENVIAR_NOMINA_ELECTRONICA_CONFIG: EmitirDocumentoElectronicoConfig = {
  baseFilters: BASE_FILTERS,
  columns: COLUMNS,
  filterFields: FILTER_FIELDS,
  storageKey: FILTERS_STORAGE_KEY,
  descartable: true,
  reemitePendientes: true,
  textos: (t) => t.entities.enviarNominaElectronica,
};
