import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { SALDO_INICIAL_COLUMNS, SALDO_INICIAL_FILTERS } from './saldo-inicial.constants';

/**
 * **Saldo inicial**: la cartera con la que una empresa arranca en el sistema.
 * Cada documento es una fila de un Excel, sin líneas.
 *
 * Es listado e importación, igual que en el ERP anterior: no hay alta, edición
 * ni ficha, y `total` es `readOnly` en el backend, así que un formulario no
 * podría fijar el saldo.
 *
 * `canImportExcel` está encendido para probar contra el backend, que todavía
 * no declara cómo distinguir CxC de CxP al importar: un archivo podría cargar
 * saldos del tipo equivocado. Lo que falta está en
 * `docs/saldo-inicial-pendientes.md`.
 */
function saldoInicialConfig(documentTypeId: number): DocumentEntityConfig {
  return {
    kind: 'document',
    id: 'saldo-inicial',
    displayNameKey: 'entities.saldoInicial.name',
    endpoint: '/api/general/documento',
    documentTypeId,
    schemaVersion: 1,
    columns: SALDO_INICIAL_COLUMNS,
    filters: SALDO_INICIAL_FILTERS,
    defaultSort: [
      { field: 'estado_aprobado', direction: 'asc' },
      { field: 'fecha', direction: 'desc' },
      { field: 'numero', direction: 'desc' },
      { field: 'id', direction: 'desc' },
    ],
    routes: {
      list: 'saldo-inicial/list',
      new: 'saldo-inicial/nuevo',
      edit: 'saldo-inicial/editar',
      detail: 'saldo-inicial/detalle',
    },
    capabilities: {
      canCreate: false,
      canEdit: false,
      canView: false,
      canDelete: true,
      canSelectRows: true,
      canExportExcel: true,
      canExportZip: false,
      canGenerate: false,
      canImportExcel: true,
    },
    extraActionIds: ['export-excel'],
  };
}

/** Saldo inicial de cuentas por cobrar (módulo Cartera). */
export const SALDO_INICIAL_CXC_CONFIG = saldoInicialConfig(DOCUMENT_TYPE_ID.SALDO_INICIAL_CXC);

/** Saldo inicial de cuentas por pagar (módulo Tesorería). */
export const SALDO_INICIAL_CXP_CONFIG = saldoInicialConfig(DOCUMENT_TYPE_ID.SALDO_INICIAL_CXP);
