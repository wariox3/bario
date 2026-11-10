import type { FilterCondition } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import type { ImportMaster } from '@erp/core/components/import-dialog/import-dialog.types';
import { IMPORT_MASTER } from '@erp/core/components/import-dialog/import-masters.constant';

/** Separada de la del informe: cada pantalla recuerda sus propios filtros. */
export const MOVIMIENTO_UTILIDAD_FILTERS_STORAGE_KEY = 'contabilidad:movimientoUtilidad:filters:v1';

/**
 * Filtro permanente: solo los movimientos de **saldo inicial**. Va como
 * `baseFilters` de `buildListBody`, antes de los del usuario, y nunca se
 * muestra en la UI.
 */
export const MOVIMIENTO_UTILIDAD_BASE_FILTERS: readonly FilterCondition[] = [
  { field: 'saldo_inicial', operator: 'eq', value: true },
];

/**
 * Acciones del toolbar: importar desde Excel, descargar el Excel de la consulta
 * y eliminar el saldo inicial de un comprobante y número.
 */
export const MOVIMIENTO_UTILIDAD_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'import', labelKey: 'common.actions.import', iconClass: 'pi pi-upload' },
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
      {
        id: 'eliminar-saldo-inicial',
        labelKey: 'entities.movimientoContable.eliminarSaldoInicial.action',
        iconClass: 'pi pi-trash',
      },
    ],
  },
];

/**
 * Maestros que ofrece el diálogo de importación.
 *
 * El archivo identifica el comprobante por código, así que se ofrecen las dos
 * tablas del catálogo contable. La cuenta y el centro de costo no están porque
 * son datos **del tenant**: se consultan en las listas del propio módulo.
 */
export const MOVIMIENTO_UTILIDAD_IMPORT_MASTERS: readonly ImportMaster[] = [
  IMPORT_MASTER.comprobanteCodigo,
  IMPORT_MASTER.comprobante,
];
