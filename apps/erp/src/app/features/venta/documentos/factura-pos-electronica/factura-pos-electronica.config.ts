import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import {
  FACTURA_POS_ELECTRONICA_COLUMNS,
  FACTURA_POS_ELECTRONICA_FILTERS,
} from './factura-pos-electronica.constants';

/**
 * Configuración declarativa de **Factura POS electrónica** (punto de venta que
 * se transmite a la DIAN).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`.
 *
 * Es el mismo documento que la factura POS salvo por el tipo: la cabecera, los
 * pagos y las líneas son idénticos, y de hecho comparten las páginas de la
 * familia POS (`documentos/_shared/pos/`). Lo electrónico lo resuelve el backend
 * a partir del `documento_tipo` — el front no cambia nada más allá de exponer el
 * filtro `estado_electronico` en el listado.
 *
 * - `endpoint` no incluye el sufijo de operación (`/lista/`, `/eliminar/`):
 *   el `HttpEntityDataGateway` lo añade según corresponda.
 * - `documentTypeId` proviene de `DOCUMENT_TYPE_ID.FACTURA_POS_ELECTRONICO`
 *   (id 24) para evitar magic numbers; el gateway lo inyecta como filtro
 *   implícito.
 * - `routes` son **relativas al módulo**; el `BaseDocumentListComponent`
 *   les prepende `/t/<slug>/venta/` al navegar.
 * - `schemaVersion` incrementa cuando el shape de filtros cambia, para
 *   invalidar la clave de `localStorage` sin afectar al usuario.
 */
export const FACTURA_POS_ELECTRONICA_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'factura-pos-electronica',
  displayNameKey: 'entities.facturaPosElectronica.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.FACTURA_POS_ELECTRONICO,
  inventoryEffect: 'outflow',
  schemaVersion: 1,
  columns: FACTURA_POS_ELECTRONICA_COLUMNS,
  filters: FACTURA_POS_ELECTRONICA_FILTERS,
  routes: {
    list: 'factura-pos-electronica/list',
    new: 'factura-pos-electronica/nuevo',
    edit: 'factura-pos-electronica/editar',
    detail: 'factura-pos-electronica/detalle',
  },
  capabilities: {
    canCreate: true,
    canEdit: true,
    canView: true,
    canDelete: true,
    canSelectRows: true,
    canImport: false,
    canExportExcel: true,
    canExportZip: false,
    canGenerate: false,
  },
  // Un documento aprobado ya no se edita. Regla única consumida por la lista,
  // el detalle y el resolver de la ruta de edición.
  canEditRow: (row) => !row.estado_aprobado,
  // Acciones extra del dropdown "Acciones" (cada id ↔ un EntityActionStrategy
  // registrado en ENTITY_ACTION_PROVIDERS):
  //  - 'export-excel': descarga el listado (filtros/orden activos) a Excel.
  extraActionIds: ['export-excel'],
};
