import { DOCUMENTO_CLASE_ID } from '@reddoc/core';
import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { NOTA_CREDITO_COLUMNS, NOTA_CREDITO_FILTERS } from './nota-credito.constants';

/**
 * Configuración declarativa de **Nota crédito de venta** (`documento_tipo_id = 2`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. De la familia
 * comercial (mismas líneas que la factura de venta); ajusta una factura de venta
 * (`documento_referencia`) y puede cobrarse en el acto (sección de pagos). El
 * form y la ficha los aporta la familia `documentos/_shared/nota/`, compartida
 * con la nota débito.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/venta/` al navegar.
 */
export const NOTA_CREDITO_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'nota-credito',
  displayNameKey: 'entities.notaCredito.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.NOTA_CREDITO_VENTA,
  // La cabecera llega de `documento/<id>/detalle/`, con los impuestos agrupados.
  cabeceraConImpuestos: true,
  inventoryEffect: 'inflow',
  // Se cobra en el acto: el form y la ficha compartidos muestran la pestaña de pagos.
  hasPagos: true,
  // Arranca igual a la factura que devuelve: el form carga sus líneas con un botón.
  cargaLineasReferencia: true,
  // Lleva almacén general en la cabecera, como el ERP anterior (la débito no).
  almacenGeneral: true,
  // Motivo DIAN de la nota: solo los conceptos de la clase nota crédito de venta.
  conceptoCorreccionClaseId: DOCUMENTO_CLASE_ID.NOTA_CREDITO_VENTA,
  schemaVersion: 1,
  columns: NOTA_CREDITO_COLUMNS,
  filters: NOTA_CREDITO_FILTERS,
  defaultSort: [
    { field: 'estado_aprobado', direction: 'asc' },
    { field: 'fecha', direction: 'desc' },
    { field: 'numero', direction: 'desc' },
    { field: 'id', direction: 'desc' },
  ],
  routes: {
    list: 'nota-credito/list',
    new: 'nota-credito/nuevo',
    edit: 'nota-credito/editar',
    detail: 'nota-credito/detalle',
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
  extraActionIds: ['imprimir', 'imprimir-zip', 'export-excel'],
  // Se emite a la DIAN: el dropdown Electrónico corrige su cabecera con las
  // resoluciones de venta.
  electronico: { resolucionParams: { venta: 'True' } },
};
