import { buildNotaColumns, buildNotaFilters } from '../_shared/nota/nota-documento.constants';

/**
 * Columnas y filtros del listado de **Nota crédito de venta**.
 *
 * Se construyen con las factories compartidas de la familia de notas de venta:
 * la estructura es idéntica entre crédito y débito, solo cambia el namespace i18n
 * (`notaCredito`). Si este documento necesita divergir, deja de usar la factory
 * para la columna/filtro en cuestión.
 */
export const NOTA_CREDITO_COLUMNS = buildNotaColumns('notaCredito');
export const NOTA_CREDITO_FILTERS = buildNotaFilters('notaCredito');
