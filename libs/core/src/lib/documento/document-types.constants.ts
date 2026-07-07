/**
 * IDs del catálogo `documento_tipo` del backend.
 *
 * El endpoint genérico `general/documento/` discrimina cada tipo de documento
 * por su `documento_tipo_id`. Centralizamos los ids aquí para que ningún
 * `DocumentEntityConfig` use magic numbers — cada documento del framework
 * referencia su tipo por nombre semántico desde este mapa.
 *
 * Catálogo completo de tipos del backend (1..35). Tener un id aquí no implica
 * que el documento esté implementado en el front: solo los que tienen su
 * `DocumentEntityConfig` aparecen en la UI. El nombre semántico evita magic
 * numbers al referenciarlos.
 */
export const DOCUMENT_TYPE_ID = {
  /** Factura electrónica de venta. */
  FACTURA_VENTA: 1,
  NOTA_CREDITO_VENTA: 2,
  NOTA_DEBITO_VENTA: 3,
  PAGO: 4,
  /** Factura de compra. */
  COMPRA: 5,
  NOTA_CREDITO_COMPRA: 6,
  NOTA_DEBITO_COMPRA: 7,
  EGRESO: 8,
  ENTRADA_ALMACEN: 9,
  SALIDA_ALMACEN: 10,
  DOCUMENTO_SOPORTE: 11,
  NOTA_AJUSTE: 12,
  ASIENTO: 13,
  NOMINA: 14,
  NOMINA_ELECTRONICA: 15,
  FACTURA_VENTA_RECURRENTE: 16,
  CUENTA_COBRO: 17,
  SALDO_INICIAL_CXC: 18,
  SALDO_INICIAL_CXP: 19,
  PRIMA: 20,
  CESANTIA: 21,
  SEGURIDAD_SOCIAL: 22,
  DEPRECIACION: 23,
  FACTURA_POS_ELECTRONICO: 24,
  CIERRE_CONTABLE: 25,
  PEDIDO_CLIENTE: 26,
  FACTURA_POS: 27,
  LIQUIDACION: 28,
  REMISION: 29,
  DEVOLUCION_REMISION: 30,
  TRASLADO_ALMACEN: 31,
  FACTURA_COMPRA_RECURRENTE: 32,
  INTERES_CESANTIA: 33,
  /** Contrato de servicio (movimiento de venta). */
  CONTRATO_SERVICIO: 34,
  /** Pedido de servicio (movimiento de venta; misma familia que contrato servicio). */
  PEDIDO_SERVICIO: 35,
} as const satisfies Readonly<Record<string, number>>;

/** Nombre semántico (clave) de un tipo de documento registrado. */
export type DocumentTypeKey = keyof typeof DOCUMENT_TYPE_ID;

/** Valor numérico (id del backend) de un tipo de documento registrado. */
export type DocumentTypeId = (typeof DOCUMENT_TYPE_ID)[DocumentTypeKey];
