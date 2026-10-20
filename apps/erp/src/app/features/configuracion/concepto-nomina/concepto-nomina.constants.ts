import type { ColumnDef } from '@reddoc/core';

/** Endpoint del selector de concepto (búsqueda por `nombre__icontains`). */
export const CONCEPTO_ENDPOINT = '/humano/concepto/seleccionar/';

export const CONCEPTO_NOMINA_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'configuracion.humano.conceptoNomina.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'nombre',
    headerKey: 'configuracion.humano.conceptoNomina.columns.nombre',
    type: 'text',
    width: '16rem',
  },
  {
    field: 'concepto_nombre',
    headerKey: 'configuracion.humano.conceptoNomina.columns.concepto',
    type: 'text',
    width: '20rem',
  },
];
