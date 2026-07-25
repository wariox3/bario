import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { SALIDA_COLUMNS, SALIDA_FILTERS } from './salida.constants';

/**
 * Configuración declarativa de **Salida de almacén** (backend "SALIDA",
 * `documento_tipo_id = 10`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. Espejo de la
 * entrada —misma cabecera y mismas líneas, con el form y la ficha de la familia
 * `documentos/_shared/movimiento/`— salvo por dos cosas: descuenta stock
 * (`inventoryEffect:'outflow'`) y valoriza cada línea al **costo promedio** del
 * ítem en vez de a su costo (ver `costoFieldFor`).
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/inventario/` al navegar.
 */
export const SALIDA_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'salida',
  displayNameKey: 'entities.salida.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.SALIDA_ALMACEN,
  inventoryEffect: 'outflow',
  schemaVersion: 1,
  columns: SALIDA_COLUMNS,
  filters: SALIDA_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'salida/list',
    new: 'salida/nuevo',
    edit: 'salida/editar',
    detail: 'salida/detalle',
  },
  capabilities: {
    canCreate: true,
    canEdit: true,
    canView: true,
    canDelete: true,
    canSelectRows: true,
    // La importación de líneas por Excel del legacy queda fuera de esta versión.
    canImport: false,
    canExportExcel: true,
    canExportZip: false,
    canGenerate: false,
  },
  // Una salida aprobada ya movió stock: no se edita. Regla única consumida por
  // la lista, el detalle y el resolver de la ruta de edición.
  canEditRow: (row) => !row.estado_aprobado,
  extraActionIds: ['export-excel'],
};
