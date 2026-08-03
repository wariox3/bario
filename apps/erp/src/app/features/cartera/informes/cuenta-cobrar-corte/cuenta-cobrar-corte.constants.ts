import type { ColumnDef } from '@reddoc/core';

const I18N = 'entities.cuentaCobrarCorte';

/** Storage key de la última fecha de corte usada (persistencia por usuario). */
export const CUENTA_COBRAR_CORTE_FECHA_STORAGE_KEY = 'cuenta-cobrar-corte:fecha:v1';

/**
 * Columnas del informe de corte. Igual que el informe normal en la
 * identificación del documento/contacto, pero cierra con **saldo** (el
 * pendiente por cobrar al día del corte) en vez de afectado/pendiente.
 */
export const CUENTA_COBRAR_CORTE_COLUMNS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${I18N}.columns.id`, type: 'number', width: '70px', align: 'right' },
  {
    field: 'documento_tipo__nombre',
    headerKey: `${I18N}.columns.documentoTipo`,
    type: 'text',
    width: '140px',
  },
  { field: 'numero', headerKey: `${I18N}.columns.numero`, type: 'text', width: '110px' },
  { field: 'fecha', headerKey: `${I18N}.columns.fecha`, type: 'date', width: '110px' },
  { field: 'fecha_vence', headerKey: `${I18N}.columns.fechaVence`, type: 'date', width: '110px' },
  {
    field: 'contacto__numero_identificacion',
    headerKey: `${I18N}.columns.identificacion`,
    type: 'text',
    width: '130px',
  },
  { field: 'contacto__nombre_corto', headerKey: `${I18N}.columns.contacto`, type: 'text' },
  {
    field: 'subtotal',
    headerKey: `${I18N}.columns.subtotal`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: `${I18N}.columns.impuesto`,
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: `${I18N}.columns.total`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'saldo',
    headerKey: `${I18N}.columns.saldo`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
];
