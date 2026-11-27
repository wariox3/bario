import { DOCUMENTO_CLASE_ID } from '@reddoc/core';
import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { NOTA_AJUSTE_POS_COLUMNS, NOTA_AJUSTE_POS_FILTERS } from './nota-ajuste-pos.constants';

/**
 * Configuración declarativa de **Nota de ajuste POS** (`documento_tipo_id = 36`).
 *
 * Es la nota crédito de la factura POS electrónica: devuelve contra ella
 * (operación −1, inventario +1) y se emite a la DIAN. Vive en la familia de notas
 * de venta (`documentos/_shared/nota/`), igual que la nota crédito, con dos
 * diferencias que declara `referencia`:
 *
 * - Referencia **obligatoria**: el backend responde 400 sin ella
 *   (`validar_referencia_nota_ajuste`).
 * - Solo facturas **POS electrónicas** (tipo 24): la clase 105 junta la POS
 *   electrónica y la que no se envía (27), y el backend rechaza la segunda. Que
 *   la POS ya esté validada por la DIAN se exige recién al emitir la nota.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/venta/` al navegar.
 */
export const NOTA_AJUSTE_POS_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'nota-ajuste-pos',
  displayNameKey: 'entities.notaAjustePos.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.NOTA_AJUSTE_POS,
  // La cabecera llega de `documento/<id>/detalle/`, con los impuestos agrupados.
  cabeceraConImpuestos: true,
  inventoryEffect: 'inflow',
  // Se reintegra en el acto, como la nota crédito: pestaña de pagos.
  hasPagos: true,
  // Arranca igual a la factura POS que ajusta: el form carga sus líneas con un botón.
  cargaLineasReferencia: true,
  almacenGeneral: true,
  // Motivo DIAN de la nota: los conceptos de la clase nota de ajuste POS.
  conceptoCorreccionClaseId: DOCUMENTO_CLASE_ID.NOTA_AJUSTE_POS,
  referencia: {
    documentoClaseId: DOCUMENTO_CLASE_ID.FACTURA_POS,
    requerida: true,
    documentoTipoId: DOCUMENT_TYPE_ID.FACTURA_POS_ELECTRONICO,
  },
  schemaVersion: 1,
  columns: NOTA_AJUSTE_POS_COLUMNS,
  filters: NOTA_AJUSTE_POS_FILTERS,
  defaultSort: [
    { field: 'estado_aprobado', direction: 'asc' },
    { field: 'fecha', direction: 'desc' },
    { field: 'numero', direction: 'desc' },
    { field: 'id', direction: 'desc' },
  ],
  routes: {
    list: 'nota-ajuste-pos/list',
    new: 'nota-ajuste-pos/nuevo',
    edit: 'nota-ajuste-pos/editar',
    detail: 'nota-ajuste-pos/detalle',
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
