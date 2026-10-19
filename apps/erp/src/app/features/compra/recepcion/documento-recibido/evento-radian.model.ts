import { formatFechaCorta, toHora } from '@reddoc/core';

/**
 * Eventos RADIAN de un documento recibido: acuse (030), reclamo (031), recibo
 * del bien o servicio (032) y aceptación expresa (033) que la empresa le manda a
 * la DIAN sobre la factura del proveedor. Salen de
 * `GET /general/electronico/recepcion/evento/`; el emisor lo pone el backend.
 * El OpenAPI no declara la forma de cada evento: la de `EventoRadian` sale de
 * una respuesta real.
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

/**
 * Concepto de un reclamo (031), según la DIAN: `01` documento con
 * inconsistencias, `02` mercancía no entregada totalmente, `03` mercancía no
 * entregada parcialmente, `04` servicio no prestado.
 */
export type EventoRadianConcepto = '01' | '02' | '03' | '04';

export interface EventoRadian {
  readonly id: string;
  readonly documento: string;
  readonly emisor: number;
  readonly codigo: EventoRadianCodigo;
  /** Nombre DIAN del evento (`Reclamo de la Factura Electrónica de Venta`). */
  readonly descripcion: string;
  readonly numero: string;
  /** Si la DIAN lo registró, lo rechazó o no se pudo enviar. */
  readonly estado: EventoRadianEstado;
  /** `1` producción, `2` pruebas. */
  readonly ambiente: number;
  readonly cude: string;
  /** AAAA-MM-DD. */
  readonly fecha: string;
  /** `HH:mm:ss`. */
  readonly hora: string;
  /** Quien recibe el bien o servicio (032); vacíos en los demás eventos. */
  readonly persona_tipo_identificacion: string | null;
  readonly persona_numero_identificacion: string;
  readonly persona_nombres: string;
  readonly persona_apellidos: string;
  readonly persona_cargo: string;
  readonly persona_area: string;
  /** Solo en un reclamo (031). */
  readonly concepto_reclamo: EventoRadianConcepto | null;
  readonly respuesta_codigo: string | null;
  /** Lo que respondió la DIAN; en un rechazo, el motivo. */
  readonly respuesta_descripcion: string | null;
  /** ISO con zona; `null` si todavía no se envió. */
  readonly enviado_en: string | null;
  readonly intentos: number;
  readonly tiene_xml: boolean;
  readonly tiene_respuesta: boolean;
  /** ISO con zona. */
  readonly creado_en: string;
}

/**
 * Quien recibe la factura o la mercancía en el acuse (030) y el recibo (032)
 * (`RecepcionPersonaRequest`). La configuración la guarda como sugerencia en
 * `com_recepcion_recibe`.
 *
 * `identificacion` es el id de `GenIdentificacion` (el mismo selector que usa el
 * resto del ERP), no el código DIAN: el backend lo convierte al enviar.
 */
export interface RecepcionPersona {
  readonly identificacion: number;
  readonly numero_identificacion: string;
  readonly nombres: string;
  readonly apellidos: string;
  readonly cargo?: string;
  readonly area?: string;
}

/**
 * Cuerpo de `POST recepcion/documento-evento/`. `persona` obligatoria en 030 y
 * 032; `concepto_reclamo` solo en 031, y obligatorio ahí.
 */
export interface RegistrarEventoPayload {
  /** UUID del documento recibido. */
  readonly id: string;
  readonly codigo: EventoRadianCodigo;
  readonly persona?: RecepcionPersona;
  readonly concepto_reclamo?: EventoRadianConcepto;
}

/** Conceptos del reclamo, en el orden en que se ofrecen. */
export const CONCEPTOS_RECLAMO: readonly EventoRadianConcepto[] = ['01', '02', '03', '04'];

/** Respuesta del listado; `desde` y `hasta` llegan siempre en nulo. */
export interface EventoRadianPagina {
  readonly count: number;
  readonly page: number;
  readonly page_size: number;
  readonly results: readonly EventoRadian[];
}

/** Fila de la tabla: el evento con la persona y el envío ya legibles. */
export interface EventoRadianRow extends EventoRadian {
  /** Nombres y apellidos de quien recibe. */
  readonly persona_nombre: string;
  readonly enviado_texto: string;
}

export function toEventoRadianRow(evento: EventoRadian): EventoRadianRow {
  const enviado = evento.enviado_en ? new Date(evento.enviado_en) : null;
  return {
    ...evento,
    persona_nombre: [evento.persona_nombres, evento.persona_apellidos]
      .map((parte) => parte?.trim())
      .filter(Boolean)
      .join(' '),
    enviado_texto: enviado ? `${formatFechaCorta(evento.enviado_en, '')} ${toHora(enviado)}` : '',
  };
}
