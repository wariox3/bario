import { buildNotaColumns, buildNotaFilters } from '../_shared/nota/nota-documento.constants';

/**
 * Columnas y filtros del listado de **Nota de ajuste POS**, con las factories de
 * la familia de notas de venta (namespace i18n `notaAjustePos`).
 */
export const NOTA_AJUSTE_POS_COLUMNS = buildNotaColumns('notaAjustePos');
export const NOTA_AJUSTE_POS_FILTERS = buildNotaFilters('notaAjustePos');
