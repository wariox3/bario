/**
 * Respuesta de `POST /general/documento/electronico-log/` (`{ id }`): el rastro
 * de un documento electrónico fuera del ERP — los correos con que se notificó
 * al cliente, lo que el proveedor de correo reportó de cada uno y las
 * validaciones de la DIAN.
 *
 * Los nombres van en camelCase porque el backend reenvía tal cual la respuesta
 * del servicio de facturación electrónica.
 */
export interface ElectronicoLogResponse {
  readonly log: ElectronicoLog;
}

export interface ElectronicoLog {
  readonly correos: readonly ElectronicoCorreo[];
  readonly eventos: readonly ElectronicoEvento[];
  readonly validaciones: readonly ElectronicoValidacion[];
}

/** Lo que el servicio reportó al validar el documento (p. ej. un correo bloqueado). */
export interface ElectronicoValidacion {
  readonly codigoValidacionPk: number;
  readonly fecha: string | null;
  readonly descripcion: string | null;
}

/** Un envío del documento por correo. `codigoCorreoPk` es el id del mensaje SMTP. */
export interface ElectronicoCorreo {
  readonly codigoCorreoPk: string;
  readonly fecha: string;
  readonly numeroDocumento: string | null;
  readonly correo: string;
  readonly correoCopia: string | null;
}

/**
 * Lo que el proveedor de correo reportó sobre un envío (`enviado`, `entregado`,
 * `abierto_primera`, un rebote…). Se cuelga de su correo por `idMensaje`.
 */
export interface ElectronicoEvento {
  readonly codigoEventoPk: number;
  readonly evento: string;
  readonly correo: string;
  readonly fecha: string;
  readonly idMensaje: string;
  /** Razón de un rebote o bloqueo; `null` en los eventos normales. */
  readonly motivo: string | null;
  /** Milisegundos desde epoch: más fino que `fecha`, que empata en el mismo segundo. */
  readonly epoca: string | null;
  /** IP desde la que se reportó el evento (la del lector en una apertura). */
  readonly ipEnvio?: string | null;
  readonly correoFecha: string | null;
}
