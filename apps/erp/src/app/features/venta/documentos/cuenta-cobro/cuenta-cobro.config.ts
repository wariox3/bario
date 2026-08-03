import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { CUENTA_COBRO_COLUMNS, CUENTA_COBRO_FILTERS } from './cuenta-cobro.constants';

/**
 * Configuración declarativa de **Cuenta de cobro** (tipo 17).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`.
 *
 * Estructuralmente es un documento de la familia POS —cabecera comercial +
 * detalles + sección de pagos, se cobra en el acto— por lo que reúsa las páginas
 * de `documentos/_shared/pos/`; lo único que la distingue es su `documento_tipo`.
 *
 * A diferencia de la factura POS, la cuenta de cobro **no afecta inventario**
 * (se omite `inventoryEffect`) y **no es electrónica** (sin filtro
 * `estado_electronico`).
 *
 * - `endpoint` no incluye el sufijo de operación (`/lista/`, `/eliminar/`):
 *   el `HttpEntityDataGateway` lo añade según corresponda.
 * - `routes` son **relativas al módulo**; el `BaseDocumentListComponent`
 *   les prepende `/t/<slug>/venta/` al navegar.
 */
export const CUENTA_COBRO_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'cuenta-cobro',
  displayNameKey: 'entities.cuentaCobro.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.CUENTA_COBRO,
  schemaVersion: 1,
  columns: CUENTA_COBRO_COLUMNS,
  filters: CUENTA_COBRO_FILTERS,
  routes: {
    list: 'cuenta-cobro/list',
    new: 'cuenta-cobro/nuevo',
    edit: 'cuenta-cobro/editar',
    detail: 'cuenta-cobro/detalle',
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
