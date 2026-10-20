import type { ColumnDef } from '@reddoc/core';

export const CONCEPTO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'configuracion.humano.concepto.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'nombre',
    headerKey: 'configuracion.humano.concepto.columns.nombre',
    type: 'text',
    width: '20rem',
  },
  {
    field: 'concepto_tipo_nombre',
    headerKey: 'configuracion.humano.concepto.columns.tipo',
    type: 'text',
    width: '16rem',
  },
  {
    field: 'porcentaje_label',
    headerKey: 'configuracion.humano.concepto.columns.porcentaje',
    type: 'text',
    width: '104px',
    align: 'right',
  },
];
