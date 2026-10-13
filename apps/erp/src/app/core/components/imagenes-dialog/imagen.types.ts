/**
 * Imagen de un registro tal como la sirve `general/imagen/`.
 *
 * El recurso también devuelve `modelo`, `objeto_id` y `uuid`; acá viven solo
 * los campos que la galería muestra o necesita para operar.
 */
export interface Imagen {
  readonly id: number;
  /** Fecha de carga en ISO. */
  readonly fecha: string;
  /** La que representa al registro: la del encabezado de la ficha. Hay una sola. */
  readonly principal: boolean;
  /** Imagen completa. `null` si el almacenamiento todavía no la resolvió. */
  readonly url: string | null;
  /** Versión reducida, para las grillas. Mismo caso de `null` que `url`. */
  readonly url_miniatura: string | null;
}
