/**
 * Contrato base de **Documento** (cross-app).
 *
 * Todos los documentos transaccionales del negocio —factura de venta, compra,
 * notas crédito/débito, contrato/pedido de servicio, factura POS…— se guardan en
 * la misma tabla (`/api/general/documento`, con líneas en
 * `/api/general/documento-detalle`) y se discriminan por `documento_tipo`. Lo que
 * cambia entre ellos es **qué campos usa cada familia**, no la tabla.
 *
 * Estas interfaces capturan **solo el esqueleto común** a cualquier documento.
 * Cada familia (ERP servicio, comercial, POS…) las **extiende** (`extends`)
 * agregando sus campos propios. Así un campo común nuevo en el backend se agrega
 * **una sola vez** aquí y todas las familias lo heredan.
 *
 * Son tipos puros: sin Angular, sin HTTP. La maquinaria de transporte y de
 * navegación (gateway, config, registry) es específica de cada app y vive fuera.
 *
 * Convención de tipos del backend: montos y horas viajan como `string` con cola
 * de decimales (`"18817299.435000"`, `"48.00"`); las fechas como `string`
 * (`yyyy-MM-dd`); los `*_nombre` etiquetan selectores al cargar en edición.
 */

/**
 * Fila plana del listado `…/documento/lista/`. Trae los acumulados que calcula el
 * backend (montos, totales) y las banderas de estado; no trae `detalles`.
 */
export interface DocumentoListRowBase {
  readonly id: number;
  readonly numero: string | null;
  readonly fecha: string | null;
  readonly fecha_contable: string | null;
  readonly fecha_vence: string | null;
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly soporte: string | null;
  readonly orden_compra: string | null;
  readonly remision: string | null;
  readonly comentario: string | null;
  readonly documento_tipo: number;
  readonly documento_tipo_nombre: string | null;
  readonly contacto: number | null;
  readonly contacto_nombre: string | null;
  readonly tercero_numero_identificacion: string | null;
  readonly resolucion: number | null;
  readonly plazo_pago: number | null;
  readonly asesor: number | null;
  readonly cuenta_banco: number | null;
  readonly comprobante: number | null;
  readonly cuenta: number | null;
  readonly documento_referencia: number | null;
  readonly subtotal: string | null;
  readonly descuento: string | null;
  readonly total_bruto: string | null;
  readonly base_impuesto: string | null;
  readonly impuesto: string | null;
  readonly impuesto_retencion: string | null;
  readonly total: string | null;
  readonly estado_aprobado: boolean;
  readonly estado_anulado: boolean;
  readonly estado_contabilizado: boolean;
}

/** Cabecera de un documento leída desde la API en edición (`GET …/documento/:id/`). */
export interface DocumentoReadBase {
  readonly id: number;
  readonly contacto: number | null;
  /** Nombre del contacto para etiquetar el autocomplete al cargar en edición. */
  readonly contacto_nombre?: string | null;
  /** Fecha en formato `yyyy-MM-dd`. */
  readonly fecha: string | null;
  readonly estado_aprobado: boolean;
}

/** Cuerpo común enviado en `POST`/`PATCH` de la cabecera de un documento. */
export interface DocumentoPayloadBase {
  readonly documento_tipo: number;
  readonly contacto: number | null;
  readonly fecha: string | null;
}

/** Línea de detalle común leída desde la API en edición. */
export interface DocumentoDetalleReadBase {
  /** Id de la línea (para distinguir existente vs nueva al editar). */
  readonly id?: number | null;
  readonly item: number | null;
  readonly item_nombre?: string | null;
  readonly cantidad: string | number | null;
  readonly precio: string | number | null;
  readonly impuestos?: readonly DocumentoDetalleImpuestoRead[] | null;
}

/** Cuerpo común de una línea de detalle enviada en `POST`/`PATCH`. */
export interface DocumentoDetallePayloadBase {
  readonly item: number | null;
  readonly cantidad: number | null;
  /** Precio como string con 2 decimales (`"1000000.00"`). */
  readonly precio: string;
  readonly impuestos_ids: readonly number[];
}

/** Impuesto de una línea tal como lo devuelve el read-model. Genérico a cualquier documento. */
export interface DocumentoDetalleImpuestoRead {
  /** Id del impuesto (FK), p.ej. 1 = IVA 19%. Es lo que espera el multiselector. */
  readonly impuesto: number;
  readonly impuesto_nombre?: string | null;
  /** Porcentaje del impuesto, e.g. `"19.000000"`. */
  readonly porcentaje?: string | null;
  /** Porcentaje de la base sobre la que aplica, e.g. `"100.000000"` o `"10.000000"` para AIU. */
  readonly porcentaje_base?: string | null;
  /** Monto ya calculado por el backend, e.g. `"796537.456000"`. */
  readonly total?: string | null;
}
