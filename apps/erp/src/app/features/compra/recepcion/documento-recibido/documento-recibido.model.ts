/**
 * Bandeja de recepción: los documentos que los proveedores mandan al buzón del
 * emisor en RedEDoc. El backend la expone en `/general/electronico/` y saca el
 * emisor de `gen_rededoc_emisor`, así que el front no lo manda.
 *
 * El OpenAPI no declara la forma de `results` (`additionalProperties`): la de
 * `DocumentoRecibido` sale de una respuesta real. Montos como `string` con dos
 * decimales, igual que el resto del backend.
 */

/** Tipos de documento que acepta el filtro `documento_tipo`. */
export type DocumentoRecibidoTipo = 'factura_venta' | 'nota_credito' | 'nota_debito';

/** Campos por los que ordena el backend; con `-` delante, descendente. */
export type DocumentoRecibidoOrden =
  | 'fecha_emision'
  | 'numero'
  | 'total_a_pagar'
  | 'creado_en'
  | `-${'fecha_emision' | 'numero' | 'total_a_pagar' | 'creado_en'}`;

/**
 * Parámetros del listado, todos opcionales. Sin `desde` ni `hasta` el backend
 * consulta el mes en curso; con uno solo, el rango queda abierto hacia el otro.
 */
export interface DocumentoRecibidoQuery {
  /** Fecha de emisión desde (AAAA-MM-DD), inclusive. */
  readonly desde?: string;
  /** Fecha de emisión hasta (AAAA-MM-DD), inclusive. */
  readonly hasta?: string;
  readonly page?: number;
  /** 1 a 100; el backend usa 25 por defecto. */
  readonly page_size?: number;
  /** CUFE completo, NIT por el comienzo, o número y razón social en cualquier parte. */
  readonly search?: string;
  readonly documento_tipo?: DocumentoRecibidoTipo;
  /** NIT exacto del proveedor, sin DV. */
  readonly proveedor?: string;
  /** Id del correo de recepción del que salió el documento. */
  readonly correo?: number;
  readonly ordering?: DocumentoRecibidoOrden;
}

/** Un documento de la bandeja, tal como lo registró RedEDoc. */
export interface DocumentoRecibido {
  /** UUID en RedEDoc. */
  readonly id: string;
  readonly emisor: number;
  readonly documento_tipo: DocumentoRecibidoTipo;
  /** Código DIAN del tipo (`01` factura, `91` nota crédito, `92` nota débito). */
  readonly tipo_codigo_dian: string;
  readonly numero: string;
  readonly cufe_cude: string;
  /** AAAA-MM-DD. */
  readonly fecha_emision: string;
  /** `HH:mm:ss` con zona (`10:15:00-05:00`). */
  readonly hora_emision: string;
  readonly proveedor_numero_identificacion: string;
  readonly proveedor_digito_verificacion: string;
  readonly proveedor_razon_social: string;
  /** NIT de la empresa que recibe (el emisor), sin DV. */
  readonly receptor_numero_identificacion: string;
  readonly moneda: string;
  readonly valor_bruto: string;
  readonly total_impuestos: string;
  readonly total_a_pagar: string;
  /** Código de la validación DIAN (`02` = validado). */
  readonly validacion_codigo: string;
  readonly fecha_validacion: string | null;
  readonly tiene_xml_factura: boolean;
  readonly tiene_pdf: boolean;
  /** Cuándo llegó a RedEDoc (ISO con zona). */
  readonly creado_en: string;
}

/** Respuesta de `GET recepcion-documento/`: página más el rango aplicado. */
export interface DocumentoRecibidoPagina {
  readonly count: number;
  readonly page: number;
  readonly page_size: number;
  /** Rango que aplicó el backend (AAAA-MM-DD). */
  readonly desde: string | null;
  readonly hasta: string | null;
  readonly results: readonly DocumentoRecibido[];
}

/** Fila de la tabla: el documento más su NIT ya armado con el DV. */
export interface DocumentoRecibidoRow extends DocumentoRecibido {
  /** `800111222-5`; sin DV, solo el número. */
  readonly proveedor_nit: string;
}

export function toDocumentoRecibidoRow(doc: DocumentoRecibido): DocumentoRecibidoRow {
  const dv = doc.proveedor_digito_verificacion;
  return {
    ...doc,
    proveedor_nit: dv
      ? `${doc.proveedor_numero_identificacion}-${dv}`
      : doc.proveedor_numero_identificacion,
  };
}
