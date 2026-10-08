import type { DocumentoRecibidoTipo } from '../documento-recibido/documento-recibido.model';

/**
 * Correos de recepción: lo que llegó al buzón del emisor en RedEDoc (o se cargó
 * a mano), qué documentos salieron de cada uno y, si falló, por qué. Es la
 * pantalla de soporte para "el proveedor dice que mandó la factura y no está".
 *
 * El OpenAPI no declara la forma de `results`: la de `CorreoRecibido` sale de
 * una respuesta real.
 */

export type CorreoRecibidoEstado =
  | 'pendiente'
  | 'procesado'
  | 'sin_documentos'
  | 'error'
  | 'empresa_desconocida'
  | 'confirmacion_reenvio';

/** `correo` llegó al buzón; `carga` se subió a mano desde Documentos. */
export type CorreoRecibidoOrigen = 'correo' | 'carga';

export type CorreoRecibidoOrden = 'recibido_en' | '-recibido_en' | 'estado' | '-estado';

/** Parámetros del listado, todos opcionales. Sin fechas, el mes en curso. */
export interface CorreoRecibidoQuery {
  /** Recibido desde (AAAA-MM-DD), inclusive. */
  readonly desde?: string;
  /** Recibido hasta (AAAA-MM-DD), inclusive. */
  readonly hasta?: string;
  readonly page?: number;
  readonly page_size?: number;
  /** Remitente, asunto o Message-ID. */
  readonly search?: string;
  readonly estado?: CorreoRecibidoEstado;
  readonly origen?: CorreoRecibidoOrigen;
  readonly ordering?: CorreoRecibidoOrden;
}

/** Resumen de un documento que salió del correo. */
export interface CorreoRecibidoDocumento {
  readonly id: string;
  readonly emisor: number;
  readonly documento_tipo: DocumentoRecibidoTipo;
  readonly numero: string;
  readonly cufe_cude: string;
  /** AAAA-MM-DD. */
  readonly fecha_emision: string;
  readonly proveedor_numero_identificacion: string;
  readonly proveedor_razon_social: string;
  readonly total_a_pagar: string;
  readonly validacion_codigo: string;
}

export interface CorreoRecibido {
  readonly id: number;
  readonly emisor: number;
  readonly origen: CorreoRecibidoOrigen;
  /** Parte local del buzón (el NIT del emisor). */
  readonly alias: string;
  readonly envelope_from: string;
  readonly envelope_to: string;
  readonly message_id: string;
  readonly asunto: string;
  /** ISO con zona. */
  readonly recibido_en: string;
  readonly estado: CorreoRecibidoEstado;
  /** Por qué no se procesó; vacío si salió bien. */
  readonly error_detalle: string;
  readonly intentos: number;
  /** Enlace de la confirmación de reenvío (Gmail), cuando el correo es eso. */
  readonly confirmacion_reenvio: string | null;
  readonly documentos: readonly CorreoRecibidoDocumento[];
}

export interface CorreoRecibidoPagina {
  readonly count: number;
  readonly page: number;
  readonly page_size: number;
  readonly desde: string | null;
  readonly hasta: string | null;
  readonly results: readonly CorreoRecibido[];
}
