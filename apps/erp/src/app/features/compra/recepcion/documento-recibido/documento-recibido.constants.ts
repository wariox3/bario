import type { ColumnDef } from '@reddoc/core';
import type { DocumentoRecibidoTipo } from './documento-recibido.model';

const I18N = 'entities.documentoRecibido';

/** Tipos del filtro, en el orden en que se ofrecen. */
export const TIPOS: readonly DocumentoRecibidoTipo[] = [
  'factura_venta',
  'nota_credito',
  'nota_debito',
];

/** Lo que acepta la carga a mano: el ZIP que manda el proveedor o su XML. */
export const CARGA_ACCEPT = '.zip,.xml';

/**
 * Columnas de la bandeja. Ordenables solo las que el backend sabe ordenar
 * (`fecha_emision`, `numero`, `total_a_pagar`): el `field` viaja tal cual como
 * `ordering`.
 */
export const COLUMNS: readonly ColumnDef[] = [
  {
    field: 'fecha_emision',
    headerKey: `${I18N}.columns.fecha`,
    type: 'date',
    width: '110px',
  },
  {
    field: 'numero',
    headerKey: `${I18N}.columns.numero`,
    type: 'text',
    width: '130px',
  },
  { field: 'proveedor_razon_social', headerKey: `${I18N}.columns.proveedor`, type: 'text' },
  { field: 'proveedor_nit', headerKey: `${I18N}.columns.nit`, type: 'text', width: '140px' },
  {
    field: 'documento_tipo',
    headerKey: `${I18N}.columns.tipo`,
    type: 'enum',
    enumKeyPrefix: `${I18N}.tipos`,
    width: '130px',
  },
  {
    field: 'total_impuestos',
    headerKey: `${I18N}.columns.impuestos`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'total_a_pagar',
    headerKey: `${I18N}.columns.total`,
    type: 'currency',
    width: '140px',
    align: 'right',
  },
];
