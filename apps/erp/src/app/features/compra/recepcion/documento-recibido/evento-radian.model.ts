/**
 * Eventos RADIAN de un documento recibido: acuse, reclamo, recibo del bien y
 * aceptación expresa que la empresa le manda a la DIAN sobre la factura del
 * proveedor. Salen de `GET /recepcion/evento/`.
 *
 * El OpenAPI todavía no declara el endpoint: los nombres de los campos son
 * provisionales hasta ver una respuesta real.
 */

/** Códigos DIAN de los eventos de recepción. */
export type EventoRadianCodigo = '030' | '031' | '032' | '033';

export type EventoRadianEstado = 'pendiente' | 'registrado' | 'rechazado' | 'error';

export interface EventoRadianQuery {
  /** UUID del documento recibido. */
  readonly documento?: string;
  readonly emisor?: number;
  readonly estado?: EventoRadianEstado;
  readonly codigo?: EventoRadianCodigo;
  readonly ordering?: 'creado_en' | 'numero' | '-creado_en' | '-numero';
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
  readonly respuesta_dian: string | null;
  readonly intentos: number;
  readonly enviado: boolean;
  readonly usuario: string | null;
  readonly cude: string | null;
}

/** Acepta la página de DRF (`results`) o la lista suelta, hasta confirmar cuál llega. */
export function toEventosRadian(res: unknown): readonly EventoRadian[] {
  if (Array.isArray(res)) return res as EventoRadian[];
  if (res && typeof res === 'object' && 'results' in res && Array.isArray(res.results)) {
    return res.results as EventoRadian[];
  }
  return [];
}
