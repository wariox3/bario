/**
 * Formatea un tamaño en bytes para mostrarlo junto a un archivo: `840 B`,
 * `12.4 KB`, `1.05 MB`.
 *
 * La precisión crece con la unidad —entero en bytes, un decimal en KB, dos en
 * MB— porque lo que el usuario compara cambia de escala: en bytes el dígito
 * suelto no dice nada, en megas sí.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
