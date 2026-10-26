import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { FACTURA_COMPRA_COLUMNS, FACTURA_COMPRA_FILTERS } from './factura-compra.constants';

/**
 * Configuración declarativa de **Factura de compra** (backend "COMPRA",
 * `documento_tipo_id = 5`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`.
 *
 * - `endpoint` no incluye el sufijo de operación (`/lista/`, `/eliminar/`):
 *   el `HttpEntityDataGateway` lo añade según corresponda.
 * - `documentTypeId` proviene de `DOCUMENT_TYPE_ID.COMPRA` para evitar magic
 *   numbers; el gateway lo inyecta como filtro implícito.
 * - `inventoryEffect: 'inflow'` — la compra ingresa mercancía (suma stock).
 * - `routes` son **relativas al módulo**; el `BaseDocumentListComponent` les
 *   prepende `/t/<slug>/compra/` al navegar.
 * - `schemaVersion` incrementa cuando el shape de filtros cambia, para
 *   invalidar la clave de `localStorage` sin afectar al usuario.
 */
export const FACTURA_COMPRA_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'factura-compra',
  displayNameKey: 'entities.facturaCompra.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.COMPRA,
  inventoryEffect: 'inflow',
  // La cabecera llega de `documento/<id>/detalle/`, con los impuestos agrupados.
  cabeceraConImpuestos: true,
  schemaVersion: 1,
  columns: FACTURA_COMPRA_COLUMNS,
  filters: FACTURA_COMPRA_FILTERS,
  defaultSort: [
    { field: 'estado_aprobado', direction: 'asc' },
    { field: 'fecha', direction: 'desc' },
    { field: 'numero', direction: 'desc' },
    { field: 'id', direction: 'desc' },
  ],
  routes: {
    list: 'factura-compra/list',
    new: 'factura-compra/nuevo',
    edit: 'factura-compra/editar',
    detail: 'factura-compra/detalle',
  },
  capabilities: {
    canCreate: true,
    canEdit: true,
    canView: true,
    canDelete: true,
    canSelectRows: true,
    canExportExcel: true,
    canExportZip: false,
    canGenerate: false,
    canCorregir: true,
  },
  // Un documento aprobado ya no se edita. Regla única consumida por la lista,
  // el detalle y el resolver de la ruta de edición.
  canEditRow: (row) => !row.estado_aprobado,
  // Acciones extra del dropdown "Acciones" (cada id ↔ un EntityActionStrategy
  // registrado en ENTITY_ACTION_PROVIDERS):
  //  - 'export-excel': descarga el listado (filtros/orden activos) a Excel.
  // `elegir-recurrente`: crear la factura desde una plantilla recurrente (botón
  // "Recurrente" del ERP anterior).
  extraActionIds: ['elegir-recurrente', 'imprimir', 'imprimir-zip', 'export-excel'],
};
