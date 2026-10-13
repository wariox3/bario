import type { EmitirDocumentoElectronicoConfig } from '@erp/core/documento-electronico';
import {
  BASE_FILTERS,
  COLUMNS,
  FILTERS_STORAGE_KEY,
  FILTER_FIELDS,
} from './enviar-factura-electronica.constants';

/**
 * Venta → Enviar factura electrónica: las facturas por emitir. Con Descartar,
 * que saca la factura del ciclo para siempre.
 */
export const ENVIAR_FACTURA_ELECTRONICA_CONFIG: EmitirDocumentoElectronicoConfig = {
  baseFilters: BASE_FILTERS,
  columns: COLUMNS,
  filterFields: FILTER_FIELDS,
  storageKey: FILTERS_STORAGE_KEY,
  descartable: true,
  textos: (t) => t.entities.enviarFacturaElectronica,
};
