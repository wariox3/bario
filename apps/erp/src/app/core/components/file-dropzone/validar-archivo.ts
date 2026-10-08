/** Por qué se rechazó un archivo antes de subirlo. */
export type ArchivoRechazo = 'tipo' | 'tamano';

/**
 * Valida un archivo contra `accept` (formato del atributo HTML: `.xlsx,.xls`) y
 * un tamaño máximo en MB. `null` si pasa.
 *
 * Solo compara extensiones: un `accept` con tipos MIME (`image/*`) no se valida
 * acá. Con `accept` vacío cualquier extensión vale.
 */
export function validarArchivo(
  file: Pick<File, 'name' | 'size'>,
  accept: string,
  maxSizeMB: number,
): ArchivoRechazo | null {
  const extensiones = accept
    .split(',')
    .map((ext) => ext.trim().toLowerCase())
    .filter(Boolean);
  const nombre = file.name.toLowerCase();
  if (extensiones.length > 0 && !extensiones.some((ext) => nombre.endsWith(ext))) return 'tipo';
  if (file.size > maxSizeMB * 1024 * 1024) return 'tamano';
  return null;
}
