/**
 * Soporte: registro de soporte del módulo de turnos, acotado por un rango de
 * fechas y asociado a un grupo.
 *
 * Shape de lectura de `POST /turno/soporte/lista/` y `GET /turno/soporte/:id/`.
 * El relacional `grupo` viaja como id "pelado" en `grupo_id`; el getById lo
 * acompaña con su `grupo_nombre` legible. Las fechas llegan como string por la
 * serialización de Django.
 */
export interface Soporte {
  readonly id: number;
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly fecha_hasta_periodo: string | null;
  readonly grupo_id: number | null;
  /** Nombre legible del FK grupo — presente en la respuesta de getById(). */
  readonly grupo_nombre?: string | null;
}
