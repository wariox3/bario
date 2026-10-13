import type { EmitirDocumentoElectronicoConfig } from '@erp/core/documento-electronico';
import {
  BASE_FILTERS,
  COLUMNS,
  FILTERS_STORAGE_KEY,
  FILTER_FIELDS,
} from './documento-electronico.constants';

/**
 * Compra → Documento electrónico: los documentos electrónicos de compra por
 * emitir. Sin Descartar.
 */
export const DOCUMENTO_ELECTRONICO_CONFIG: EmitirDocumentoElectronicoConfig = {
  baseFilters: BASE_FILTERS,
  columns: COLUMNS,
  filterFields: FILTER_FIELDS,
  storageKey: FILTERS_STORAGE_KEY,
  descartable: false,
  textos: (t) => t.entities.documentoElectronico,
};
