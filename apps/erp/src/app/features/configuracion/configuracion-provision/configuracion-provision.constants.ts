import type { ColumnDef } from '@reddoc/core';

/**
 * Provisiones que solo llevan cuenta débito: los aportes a seguridad social y
 * parafiscales. Su contrapartida es la cuenta del aporte (pestaña Aporte).
 */
export const PROVISION_SIN_CREDITO: readonly string[] = [
  'PENSION',
  'SALUD',
  'CAJA',
  'RIESGO',
  'SENA',
  'ICBF',
];

/** Columnas de la tabla de provisiones. Las etiquetas las arma `toConfiguracionProvisionRow`. */
export const CONFIGURACION_PROVISION_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'configuracion.humano.provision.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'tipo_costo_nombre',
    headerKey: 'configuracion.humano.provision.columns.tipoCosto',
    type: 'text',
    width: '12rem',
  },
  {
    field: 'tipo_label',
    headerKey: 'configuracion.humano.provision.columns.tipo',
    type: 'text',
    width: '12rem',
  },
  {
    field: 'cuenta_debito_label',
    headerKey: 'configuracion.humano.provision.columns.cuentaDebito',
    type: 'text',
    width: '18rem',
  },
  {
    field: 'cuenta_credito_label',
    headerKey: 'configuracion.humano.provision.columns.cuentaCredito',
    type: 'text',
    width: '18rem',
  },
];
