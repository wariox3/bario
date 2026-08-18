import type { ColumnDef, FilterField } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import type { ImportMaster } from '@erp/core/components/import-dialog/import-dialog.types';
import { IMPORT_MASTER } from '@erp/core/components/import-dialog/import-masters.constant';

export const MOVIMIENTO_FILTERS_STORAGE_KEY = 'movimientoContable:filters:v1';

/**
 * Columnas de la consulta, en el orden del ERP anterior: identificación del
 * movimiento (id, número, comprobante, fecha), a quién y a qué se imputó
 * (contacto, cuenta, centro de costo) y los valores.
 *
 * Los valores no son ordenables: el legacy tampoco los ordenaba, y ordenar el
 * libro por importe no es una lectura contable útil.
 */
export const MOVIMIENTO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.movimientoContable.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'numero',
    headerKey: 'entities.movimientoContable.columns.numero',
    type: 'number',
    width: '100px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'comprobante__nombre',
    headerKey: 'entities.movimientoContable.columns.comprobante',
    type: 'text',
    width: '150px',
    sortable: true,
  },
  {
    field: 'fecha',
    headerKey: 'entities.movimientoContable.columns.fecha',
    type: 'date',
    width: '120px',
    sortable: true,
  },
  {
    field: 'contacto__nombre_corto',
    headerKey: 'entities.movimientoContable.columns.contacto',
    type: 'text',
  },
  {
    field: 'cuenta__codigo',
    headerKey: 'entities.movimientoContable.columns.cuenta',
    type: 'text',
    width: '120px',
    sortable: true,
  },
  {
    // El backend lo llama `grupo`; en este ERP el concepto es el centro de costo.
    field: 'grupo__nombre',
    headerKey: 'entities.movimientoContable.columns.centroCosto',
    type: 'text',
    width: '160px',
    sortable: true,
  },
  {
    field: 'debito',
    headerKey: 'entities.movimientoContable.columns.debito',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'credito',
    headerKey: 'entities.movimientoContable.columns.credito',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'base',
    headerKey: 'entities.movimientoContable.columns.base',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'detalle',
    headerKey: 'entities.movimientoContable.columns.detalle',
    type: 'text',
  },
];

/**
 * Campos por los que se puede filtrar, los mismos del ERP anterior
 * (`MOVIMIENTO_FILTERS`). Los valores (débito, crédito, base) quedan fuera: allá
 * tampoco se filtraban.
 *
 * ⚠️ `grupo__nombre` conserva el nombre del backend aunque la etiqueta diga
 * "centro de costo": si el backend renombró el campo, esta cadena es el fix.
 */
export const MOVIMIENTO_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.movimientoContable.columns.id', type: 'number' },
  { name: 'numero', displayNameKey: 'entities.movimientoContable.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.movimientoContable.columns.fecha', type: 'date' },
  {
    name: 'cuenta__codigo',
    displayNameKey: 'entities.movimientoContable.columns.cuenta',
    type: 'string',
  },
  {
    name: 'grupo__nombre',
    displayNameKey: 'entities.movimientoContable.columns.centroCosto',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.movimientoContable.columns.contacto',
    type: 'string',
  },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.movimientoContable.columns.identificacion',
    type: 'string',
  },
  {
    name: 'comprobante__nombre',
    displayNameKey: 'entities.movimientoContable.columns.comprobante',
    type: 'string',
  },
];

/**
 * Acciones del toolbar: importar movimientos desde Excel y descargar el Excel de
 * la consulta. Sin "nuevo" — el movimiento lo genera la contabilización de un
 * documento, no se teclea.
 */
export const MOVIMIENTO_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'import', labelKey: 'common.actions.import', iconClass: 'pi pi-upload' },
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];

/**
 * Maestros que ofrece el diálogo de importación del libro.
 *
 * El archivo de movimientos identifica el comprobante por código, así que se
 * ofrecen las dos tablas del catálogo contable. La cuenta y el centro de costo
 * no están acá porque son datos **del tenant**: el usuario los consulta en sus
 * propias listas del módulo, no en un archivo global.
 */
export const MOVIMIENTO_IMPORT_MASTERS: readonly ImportMaster[] = [
  IMPORT_MASTER.comprobanteCodigo,
  IMPORT_MASTER.comprobante,
];
