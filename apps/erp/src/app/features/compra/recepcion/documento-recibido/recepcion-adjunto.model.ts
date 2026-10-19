import { formatFechaCorta, toHora } from '@reddoc/core';
import { formatBytes } from '@erp/core/utils/format-bytes';

/**
 * Archivos que llegaron a la recepción: los de cada documento (`xml`,
 * `xml_documento`, `pdf`) y los demás del correo (`otro`). Salen de
 * `GET /general/electronico/recepcion/adjunto/`, paginado de a 10 (fijo); el
 * emisor lo pone el backend. El OpenAPI no declara la forma de cada adjunto:
 * la de `RecepcionAdjunto` sale de una respuesta real.
 */

/**
 * `xml` el recibido, `xml_documento` el extraído del AttachedDocument, `pdf`, y
 * `otro` lo demás que trajo el correo.
 */
export type RecepcionAdjuntoRol = 'xml' | 'xml_documento' | 'pdf' | 'otro';

/** Adjuntos que trae cada página; el backend no deja cambiarlo. */
export const ADJUNTO_PAGE_SIZE = 10;

export interface RecepcionAdjuntoQuery {
  /** UUID del documento recibido. */
  readonly documento?: string;
  /** Id del correo de recepción. */
  readonly correo?: number;
  readonly rol?: RecepcionAdjuntoRol;
  /** Busca en el nombre original. */
  readonly search?: string;
  readonly page?: number;
}

export interface RecepcionAdjunto {
  /** UUID en RedEDoc; es lo que pide la descarga. */
  readonly id: string;
  readonly emisor: number;
  /** Correo del que salió; `null` si se cargó a mano. */
  readonly correo: number | null;
  /** UUID del documento; `null` en los `otro` que no son de ningún documento. */
  readonly documento: string | null;
  readonly rol: RecepcionAdjuntoRol;
  /** Nombre original del archivo. */
  readonly nombre: string;
  /** Tipo MIME (`application/pdf`, `application/xml`). */
  readonly tipo_contenido: string;
  /** En bytes. */
  readonly tamano: number;
  readonly sha256: string;
  /** ISO con zona. */
  readonly creado_en: string;
}

export interface RecepcionAdjuntoPagina {
  readonly count: number;
  readonly page: number;
  readonly page_size: number;
  readonly results: readonly RecepcionAdjunto[];
}

/** Fila de la tabla: el adjunto con el tamaño y la fecha ya legibles. */
export interface RecepcionAdjuntoRow extends RecepcionAdjunto {
  readonly tamano_texto: string;
  readonly creado_texto: string;
}

export function toRecepcionAdjuntoRow(adjunto: RecepcionAdjunto): RecepcionAdjuntoRow {
  const creado = adjunto.creado_en ? new Date(adjunto.creado_en) : null;
  return {
    ...adjunto,
    tamano_texto: formatBytes(adjunto.tamano),
    creado_texto: creado ? `${formatFechaCorta(adjunto.creado_en, '')} ${toHora(creado)}` : '',
  };
}
