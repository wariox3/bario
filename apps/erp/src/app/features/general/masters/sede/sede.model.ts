/**
 * Sede del módulo General (camino B).
 *
 * La FK `centro_costo` se lee/escribe sin sufijo `_id` (convención del backend)
 * y trae su companion `centro_costo_nombre` para pintar etiquetas.
 */
export interface Sede {
  readonly id: number;
  readonly nombre: string;
  readonly codigo: string;
  readonly centro_costo: number | null;
  readonly centro_costo_nombre: string | null;
}

/** Write-model para crear/editar una sede. FK como id pelado. */
export interface SedePayload {
  readonly nombre: string;
  readonly centro_costo: number | null;
}
