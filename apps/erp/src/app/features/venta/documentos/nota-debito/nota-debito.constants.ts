import { buildNotaColumns, buildNotaFilters } from '../_shared/nota/nota-documento.constants';

/**
 * Columnas y filtros del listado de **Nota débito de venta**.
 *
 * Se construyen con las factories compartidas de la familia de notas de venta:
 * la estructura es idéntica entre crédito y débito, solo cambia el namespace i18n
 * (`notaDebito`). Si este documento necesita divergir, deja de usar la factory
 * para la columna/filtro en cuestión.
 */
export const NOTA_DEBITO_COLUMNS = buildNotaColumns('notaDebito');
export const NOTA_DEBITO_FILTERS = buildNotaFilters('notaDebito');
