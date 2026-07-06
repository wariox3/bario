/**
 * Resultado del proceso **Regenerar horas**.
 *
 * El shape del backend está pendiente de confirmar; se asume `{ actualizados }`
 * (líneas de documento cuyas horas se recalcularon) y se lee de forma tolerante
 * con `pickHorasCount`, igual que el proceso "Regenerar afectado".
 */
export interface RegenerarHorasResult {
  /** Líneas de documento cuyas horas se recalcularon. */
  readonly actualizados?: number | null;
}

/**
 * Extrae un conteo mostrable de un response de forma desconocida, en orden de
 * preferencia (`actualizados` → `afectados` → `total`). Devuelve `null` si
 * ninguno es un número finito — en ese caso la consola muestra solo el éxito.
 */
export function pickHorasCount(res: unknown): number | null {
  if (res === null || typeof res !== 'object') return null;
  const record = res as Record<string, unknown>;
  for (const key of ['actualizados', 'afectados', 'total'] as const) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}
