import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { TRASLADO_COLUMNS, TRASLADO_FILTERS } from './traslado.constants';

/**
 * Configuración declarativa de **Traslado entre almacenes** (backend
 * "TRASLADO", `documento_tipo_id = 31`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. Comparte
 * cabecera, líneas, formulario y ficha con la entrada y la salida (familia
 * `documentos/_shared/movimiento/`); se distingue en dos cosas:
 *
 * - **Sin `inventoryEffect`**: no mueve stock en un solo sentido. Un traslado
 *   resta en la bodega origen y suma en la destino, así que el sentido lo
 *   declara **cada línea** (`operacion_inventario`) y no el documento. La
 *   metadata es opcional justamente para casos así.
 * - Valoriza al `costo` del ítem (el default de `costoFieldFor`), como el
 *   legacy: la mercancía no sale de la empresa, solo cambia de bodega.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/inventario/` al navegar.
 */
export const TRASLADO_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'traslado',
  displayNameKey: 'entities.traslado.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.TRASLADO_ALMACEN,
  schemaVersion: 1,
  columns: TRASLADO_COLUMNS,
  filters: TRASLADO_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'traslado/list',
    new: 'traslado/nuevo',
    edit: 'traslado/editar',
    detail: 'traslado/detalle',
  },
  capabilities: {
    canCreate: true,
    canEdit: true,
    canView: true,
    canDelete: true,
    canSelectRows: true,
    // La importación de líneas por Excel del legacy queda fuera de esta versión.
    canExportExcel: true,
    canExportZip: false,
    canGenerate: false,
  },
  // Un traslado aprobado ya movió stock: no se edita. Regla única consumida por
  // la lista, el detalle y el resolver de la ruta de edición.
  canEditRow: (row) => !row.estado_aprobado,
  extraActionIds: ['export-excel'],
};
