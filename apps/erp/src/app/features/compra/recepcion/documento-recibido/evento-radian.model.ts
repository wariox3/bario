/**
 * Eventos RADIAN de un documento recibido: acuse (030), reclamo (031), recibo
 * del bien o servicio (032) y aceptación expresa (033) que la empresa le manda a
 * la DIAN sobre la factura del proveedor. Salen de
 * `GET /general/electronico/recepcion/evento/`; el emisor lo pone el backend.
 *
 * El OpenAPI declara filtros y página, pero no la forma de cada evento
 * (`additionalProperties`): esos campos son provisionales hasta ver una
 * respuesta real. Sí está declarado que el motivo de un rechazo viene en
 * `respuesta_descripcion`.
 */

export type EventoRadianCodigo = '030' | '031' | '032' | '033';

export type EventoRadianEstado = 'pendiente' | 'registrado' | 'rechazado' | 'error';

export interface EventoRadianQuery {
  /** UUID del documento recibido. */
  readonly documento?: string;
  readonly estado?: EventoRadianEstado;
  readonly codigo?: EventoRadianCodigo;
  /** Por defecto, los más recientes primero. */
  readonly ordering?: 'creado_en' | 'numero' | '-creado_en' | '-numero';
  readonly page?: number;
  /** 1 a 100; el backend usa 25 por defecto. */
  readonly page_size?: number;
}

export interface EventoRadian {
  readonly id: string;
  readonly numero: string;
  readonly codigo: EventoRadianCodigo;
  readonly estado: EventoRadianEstado;
  readonly firmado: boolean;
  readonly persona_recibe: string | null;
  readonly concepto: string | null;
  readonly reclamo: string | null;
  /** Lo que respondió la DIAN; en un rechazo, el motivo. */
  readonly respuesta_descripcion: string | null;
  readonly intentos: number;
  readonly enviado: boolean;
  readonly usuario: string | null;
  readonly cude: string | null;
}

/** Respuesta del listado; `desde` y `hasta` llegan siempre en nulo. */
export interface EventoRadianPagina {
  readonly count: number;
  readonly page: number;
  readonly page_size: number;
  readonly results: readonly EventoRadian[];
}
