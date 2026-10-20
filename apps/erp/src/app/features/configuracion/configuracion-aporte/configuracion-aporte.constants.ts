import type { ColumnDef } from '@reddoc/core';

/** Columnas de la tabla de aportes. Las etiquetas las arma `toConfiguracionAporteRow`. */
export const CONFIGURACION_APORTE_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'configuracion.humano.aporte.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'tipo_label',
    headerKey: 'configuracion.humano.aporte.columns.tipo',
    type: 'text',
    width: '14rem',
  },
  {
    field: 'cuenta_label',
    headerKey: 'configuracion.humano.aporte.columns.cuenta',
    type: 'text',
    width: '24rem',
  },
];
