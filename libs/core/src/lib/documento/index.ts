export type {
  DocumentoListRowBase,
  DocumentoEstados,
  DocumentoReadBase,
  DocumentoPayloadBase,
  DocumentoDetalleReadBase,
  DocumentoDetallePayloadBase,
  DocumentoDetalleImpuestoRead,
  DocumentoImpuestoAgrupadoRead,
  DocumentoTotalesRead,
} from './documento.types';
export { impuestosAgrupadosToResumen } from './documento-impuestos';
export { cuentasDesdeCabecera, resumenDesdeCabecera } from './documento-resumen';
export type { CuentasCabecera } from './documento-resumen';
export type {
  EntityKind,
  InventoryEffect,
  DocumentCapabilities,
  DocumentElectronicoConfig,
  EditableRowContext,
  EntityRoutes,
  DocumentEntityConfig,
  EntityConfig,
} from './entity-config.types';
export type { ModuleConfig } from './module-config.types';
export { DOCUMENT_TYPE_ID, DOCUMENTO_CLASE_ID } from './document-types.constants';
export type { DocumentTypeId, DocumentTypeKey } from './document-types.constants';
export { ENTITY_DATA_GATEWAY } from './entity-data-gateway';
export type { EntityDataGateway } from './entity-data-gateway';
export { HttpEntityDataGateway } from './http-entity-data-gateway.service';
export { documentoContactoToOption } from './documento-contacto';
export type { DocumentoContactoRead } from './documento-contacto';
export { DocumentoDetalleService } from './documento-detalle.service';

// Líneas comerciales (ítem · cantidad · precio · impuestos): factura, notas, POS…
export type {
  ComercialDetalleRead,
  ComercialDetallePayload,
} from './comercial/comercial-documento-detalle.model';
export type { ComercialDetalleFormRawValue } from './comercial/comercial-documento-detalle.types';
export {
  lineBruto,
  lineDescuento,
  lineBase,
  lineImpuesto,
  lineNeto,
  recomputeImpuestosLinea,
  precioUnitarioConImpuestos,
  precioUnitarioSinImpuestos,
  toLineaCalculo,
  tasasDelItem,
  comercialDetalleToFormValue,
  lineaReferenciaToFormValue,
  comercialDetalleToPayload,
  totalCantidad,
} from './comercial/comercial-documento-detalle.mapper';
export { precioListaDeContacto } from './comercial/precio-lista-contacto';

// Pagos de documento (`documento-pago`): recurso aparte del documento.
export type { PagoRead, PagoPayload } from './pagos/pago.model';
export type { PagoCalculable, ResumenPagos } from './pagos/pago.calculo';
export { calcularPagos } from './pagos/pago.calculo';
export { CUENTA_BANCO_ENDPOINT, DOCUMENTO_PAGO_ENDPOINT } from './pagos/pago.constants';
export { DocumentoPagoService } from './pagos/pago.service';

// Cabecera de la familia POS (factura POS 27 y POS electrónica 24).
export type {
  PosDocumentoRead,
  PosDocumentoPayload,
  PosDocumentoValores,
} from './pos/pos-documento.model';
export { posDocumentoToFormValue, posDocumentoToPayload } from './pos/pos-documento.mapper';

// Qué se imprime desde un listado (selección / filtros / umbral), ERP y POS.
export { alcanceImpresion, UMBRAL_CONFIRMACION_IMPRESION } from './impresion/alcance-impresion';
export type { AlcanceImpresion } from './impresion/alcance-impresion';
