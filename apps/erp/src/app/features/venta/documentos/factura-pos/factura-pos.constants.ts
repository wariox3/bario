import { buildPosColumns, buildPosFilters } from '../_shared/pos/pos-documento.constants';

/**
 * Columnas y filtros del listado de **Factura POS**.
 *
 * Se construyen con las factories compartidas de la familia POS: la estructura
 * es idéntica entre documentos, solo cambia el namespace i18n (`facturaPos`). Si
 * este documento necesita divergir de la familia, deja de usar la factory para
 * la columna/filtro en cuestión.
 *
 * Sin el filtro `estado_electronico`: este POS no se transmite a la DIAN (ese es
 * el de tipo 24, `factura-pos-electronica`).
 */
export const FACTURA_POS_COLUMNS = buildPosColumns('facturaPos');
export const FACTURA_POS_FILTERS = buildPosFilters('facturaPos');
