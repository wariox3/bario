/**
 * Modelo del **prototipo** de turnos de un puesto.
 *
 * Un prototipo es la base para simular y generar automáticamente los turnos de
 * los contratos de un puesto (`documento_detalle`): por cada contrato se define
 * su secuencia, la fecha de inicio del ciclo y la posición inicial. Vive sobre el
 * endpoint `/turno/prototipo` (GET / POST / PUT / DELETE).
 *
 * NOTA sobre los FK: el serializer usa los nombres **sin** sufijo `_id`
 * (`contrato`, `secuencia`, `documento_detalle`) aunque las columnas DB sean
 * `*_id` — convención de Django REST. Los payloads envían enteros con esos
 * nombres.
 */

/** Campos escribibles de una fila de prototipo (`POST` / `PUT`). */
export interface PrototipoPayload {
  /** Fecha ISO `YYYY-MM-DD` del período (mes) — común a las filas del puesto. */
  readonly fecha: string;
  /** Fecha ISO `YYYY-MM-DD` desde la que arranca el ciclo de la secuencia. */
  readonly fecha_inicio: string;
  /**
   * Puesto al que pertenece el prototipo: es el **detalle del documento afectado**
   * (`documento_detalle_afectado_id` de la fila de programación), no la línea de
   * programación en sí. El front solo persiste cuando ese detalle existe.
   */
  readonly documento_detalle: number;
  readonly secuencia: number;
  readonly contrato: number;
  /** Posición inicial del ciclo de la secuencia. */
  readonly posicion: number;
}

/**
 * Fila de prototipo tal como la devuelve el backend (read-model): el payload más
 * el `id` y varios campos de display de solo lectura para pintar la tabla sin
 * pedirlos aparte.
 *
 * OJO: en la respuesta `fecha` viene como datetime con zona
 * (`2026-07-01T00:00:00-05:00`), mientras que en el payload se envía como fecha
 * ISO `YYYY-MM-DD` — por eso `fecha` se declara `string` en ambos.
 */
export interface Prototipo extends PrototipoPayload {
  readonly id: number;
  readonly contrato_nombre?: string | null;
  /** Nº de identificación del contacto del contrato (C.C./NIT), para el autocomplete. */
  readonly contrato_contacto_numero_identificacion?: string | null;
  readonly secuencia_nombre?: string | null;
  readonly puesto_nombre?: string | null;
  readonly documento_numero?: number | null;
  readonly documento_fecha?: string | null;
  readonly documento_documento_tipo_nombre?: string | null;
}
