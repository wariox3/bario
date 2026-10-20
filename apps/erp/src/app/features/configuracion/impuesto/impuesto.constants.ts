import type { ColumnDef } from '@reddoc/core';
import type { RowAction } from '@reddoc/feature-base';

/**
 * Columnas de la tabla de impuestos.
 *
 * Todo es de solo lectura salvo la cuenta, que es lo único que el PATCH acepta.
 * La cuenta lee la etiqueta ya armada por `toImpuestoRow`, no los campos crudos.
 * Los anchos siguen el mismo criterio que la tabla de tipos de documento: apenas
 * por encima del encabezado, y el sobrante va al nombre extendido y a la cuenta.
 */
export const IMPUESTO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'configuracion.general.impuesto.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'nombre',
    headerKey: 'configuracion.general.impuesto.columns.nombre',
    type: 'text',
    width: '9rem',
  },
  {
    field: 'nombre_extendido',
    headerKey: 'configuracion.general.impuesto.columns.nombreExtendido',
    type: 'text',
    width: '18rem',
  },
  {
    field: 'impuesto_tipo_nombre',
    headerKey: 'configuracion.general.impuesto.columns.tipo',
    type: 'text',
    width: '10rem',
  },
  {
    field: 'porcentaje',
    headerKey: 'configuracion.general.impuesto.columns.porcentaje',
    type: 'number',
    width: '104px',
    align: 'right',
  },
  {
    field: 'porcentaje_base',
    headerKey: 'configuracion.general.impuesto.columns.porcentajeBase',
    type: 'number',
    width: '88px',
    align: 'right',
  },
  {
    field: 'venta',
    headerKey: 'configuracion.general.impuesto.columns.venta',
    type: 'boolean',
    width: '74px',
    align: 'center',
  },
  {
    field: 'compra',
    headerKey: 'configuracion.general.impuesto.columns.compra',
    type: 'boolean',
    width: '82px',
    align: 'center',
  },
  {
    field: 'cuenta_label',
    headerKey: 'configuracion.general.impuesto.columns.cuenta',
    type: 'text',
    width: '16rem',
  },
];

/** Única acción de fila, `inline` por ser la razón de ser de la tabla. */
export const IMPUESTO_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
];

/** Alto del cuerpo de la tabla: va embebida en una tarjeta, no llena la página. */
export const IMPUESTO_TABLE_HEIGHT = '26rem';
