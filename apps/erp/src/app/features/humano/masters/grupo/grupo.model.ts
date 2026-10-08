export interface Grupo {
  readonly id: number;
  readonly nombre: string;
  /** Id del período: `1` quincenal, `2` mensual (ver `GRUPO_PERIODO_*`). */
  readonly periodo: number;
  /**
   * Nombre del período tal como lo escribe el backend (`'QUINCENAL'`), en
   * mayúsculas. La UI **no** lo pinta: resuelve la etiqueta desde `periodo` con
   * el diccionario, para que se lea igual que en el selector del formulario y
   * en el idioma activo. Queda como respaldo por si aparece un período que el
   * front todavía no conoce.
   */
  readonly periodo_nombre: string;
  /** Días que dura el período: 15 el quincenal, 30 el mensual. */
  readonly periodo_dias: number;
}

export interface GrupoPayload {
  nombre: string;
  periodo: number | null;
}
