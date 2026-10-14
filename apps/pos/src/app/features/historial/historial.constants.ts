import {
  DOCUMENT_TYPE_ID,
  type ColumnDef,
  type FilterCondition,
  type FilterField,
} from '@reddoc/core';
import type { RowAction } from '@reddoc/feature-base';

/** Filtros del usuario en el historial, recordados en el dispositivo. */
export const HISTORIAL_FILTROS_STORAGE_KEY = 'pos:historial:filtros:v1';

/** La búsqueda rápida busca por nombre del cliente. */
export const HISTORIAL_BUSQUEDA_CAMPO = 'contacto__nombre_corto';

/**
 * Lo que el historial siempre muestra: las facturas de caja, de los dos tipos
 * con los que puede facturar el POS. El `in` va con el valor como arreglo.
 */
export const HISTORIAL_FILTRO_BASE: FilterCondition = {
  field: 'documento_tipo_id',
  operator: 'in',
  value: [DOCUMENT_TYPE_ID.FACTURA_POS, DOCUMENT_TYPE_ID.FACTURA_POS_ELECTRONICO],
};

/** Más recientes primero. */
export const HISTORIAL_ORDEN_DEFAULT = [
  { field: 'fecha', direction: 'desc' },
  { field: 'numero', direction: 'desc' },
  { field: 'id', direction: 'desc' },
] as const;

const COL = 'historial.columns';

export const HISTORIAL_COLUMNAS: readonly ColumnDef[] = [
  { field: 'numero', headerKey: `${COL}.numero`, type: 'text', width: '110px' },
  { field: 'fecha', headerKey: `${COL}.fecha`, type: 'date', width: '110px' },
  { field: 'documento_tipo_nombre', headerKey: `${COL}.tipo`, type: 'text', width: '180px' },
  {
    field: 'contacto_numero_identificacion',
    headerKey: `${COL}.identificacion`,
    type: 'text',
    width: '140px',
  },
  { field: 'contacto_nombre_corto', headerKey: `${COL}.contacto`, type: 'text' },
  {
    field: 'subtotal',
    headerKey: `${COL}.subtotal`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: `${COL}.impuesto`,
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  { field: 'total', headerKey: `${COL}.total`, type: 'currency', width: '140px', align: 'right' },
  {
    field: 'estado_aprobado',
    headerKey: `${COL}.aprobado`,
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: `${COL}.anulado`,
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_electronico',
    headerKey: `${COL}.electronico`,
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

const FIL = 'historial.filtros';

export const HISTORIAL_CAMPOS_FILTRO: readonly FilterField[] = [
  { name: 'numero', displayNameKey: `${COL}.numero`, type: 'string' },
  { name: 'fecha', displayNameKey: `${COL}.fecha`, type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: `${COL}.identificacion`,
    type: 'string',
  },
  { name: 'contacto__nombre_corto', displayNameKey: `${COL}.contacto`, type: 'string' },
  { name: 'estado_aprobado', displayNameKey: `${FIL}.aprobado`, type: 'boolean' },
  { name: 'estado_anulado', displayNameKey: `${FIL}.anulado`, type: 'boolean' },
  { name: 'estado_electronico', displayNameKey: `${FIL}.electronico`, type: 'boolean' },
];

export const HISTORIAL_ACCIONES_FILA: readonly RowAction[] = [
  {
    id: 'imprimir',
    labelKey: 'historial.acciones.imprimir',
    iconClass: 'pi pi-print',
    inline: true,
  },
];
