import type { ColumnDef, ErpSelectOption, FilterField } from '@reddoc/core';

/** Endpoint `seleccionar` de sedes. */
export const SEDE_ENDPOINT = '/general/sede/seleccionar/';
/** Endpoint `seleccionar` de métodos de pago. */
export const METODO_PAGO_ENDPOINT = '/general/metodo-pago/seleccionar/';

/**
 * Etiqueta de un asesor en el desplegable.
 *
 * `general/asesor/seleccionar/` es el raro del lote: devuelve `{ id, nombre_corto }`
 * y no el `nombre` que `lib-api-select` muestra y filtra por defecto. De ahí que
 * el campo vaya con `[displayWith]="asesorLabel"` **y** `filterBy="nombre_corto"`
 * —sin lo segundo la persona teclearía lo que ve y no encontraría nada—.
 */
export function asesorLabel(option: ErpSelectOption): string {
  return String(option['nombre_corto'] ?? option.nombre ?? '');
}

/**
 * Columnas visibles del listado de Factura de venta recurrente.
 *
 * Mismo set que la factura de venta (la recurrente es su plantilla): id,
 * identificación, desglose de montos y flags de estado. Los `field` mapean el
 * shape canónico del endpoint `general/documento/lista/` (`DocumentoListRowBase`).
 */
export const FACTURA_VENTA_RECURRENTE_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.facturaVentaRecurrente.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.facturaVentaRecurrente.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.facturaVentaRecurrente.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.facturaVentaRecurrente.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.facturaVentaRecurrente.columns.contacto',
    type: 'text',
  },
  {
    field: 'subtotal',
    headerKey: 'entities.facturaVentaRecurrente.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'entities.facturaVentaRecurrente.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.facturaVentaRecurrente.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.facturaVentaRecurrente.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.facturaVentaRecurrente.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const FACTURA_VENTA_RECURRENTE_FILTERS: readonly FilterField[] = [
  {
    name: 'numero',
    displayNameKey: 'entities.facturaVentaRecurrente.columns.numero',
    type: 'string',
  },
  { name: 'fecha', displayNameKey: 'entities.facturaVentaRecurrente.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.facturaVentaRecurrente.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.facturaVentaRecurrente.columns.contacto',
    type: 'string',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.facturaVentaRecurrente.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.facturaVentaRecurrente.filters.contabilizado',
    type: 'boolean',
  },
];
