import { buildPosColumns, buildPosFilters } from '../_shared/pos/pos-documento.constants';

/**
 * Columnas y filtros del listado de **Factura POS electrónica**.
 *
 * Se construyen con las factories compartidas de la familia POS: la estructura
 * es idéntica entre documentos, solo cambia el namespace i18n
 * (`facturaPosElectronica`). Si este documento necesita divergir de la familia,
 * deja de usar la factory para la columna/filtro en cuestión.
 *
 * A diferencia del POS normal suma el filtro `estado_electronico`: este
 * documento sí se transmite a la DIAN, así que el flag varía por fila y sirve
 * para aislar lo pendiente de transmitir (mismo criterio que la factura de
 * venta electrónica).
 */
export const FACTURA_POS_ELECTRONICA_COLUMNS = buildPosColumns('facturaPosElectronica');
export const FACTURA_POS_ELECTRONICA_FILTERS = buildPosFilters('facturaPosElectronica', {
  electronico: true,
});
