import { buildPosColumns, buildPosFilters } from '../_shared/pos/pos-documento.constants';

/**
 * Columnas y filtros del listado de **Cuenta de cobro**.
 *
 * Se construyen con las factories compartidas de la familia POS: la cuenta de
 * cobro es estructuralmente un POS (cabecera comercial + detalles + pagos), solo
 * cambia el namespace i18n (`cuentaCobro`). Si este documento necesita divergir
 * de la familia, deja de usar la factory para la columna/filtro en cuestión.
 *
 * Sin el filtro `estado_electronico`: la cuenta de cobro no se transmite a la
 * DIAN (no es un documento electrónico).
 */
export const CUENTA_COBRO_COLUMNS = buildPosColumns('cuentaCobro');
export const CUENTA_COBRO_FILTERS = buildPosFilters('cuentaCobro');
