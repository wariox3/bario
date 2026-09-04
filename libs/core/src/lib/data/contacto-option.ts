/**
 * Etiqueta canónica de un contacto en los selects del ERP.
 *
 * Una sola función para que el texto que se ve al **elegir** un contacto en el
 * autocomplete y el que se ve al **abrir un formulario en edición** sean el
 * mismo. Antes cada lado la armaba por su cuenta y el de edición se quedaba
 * corto: mostraba solo el nombre, sin la identificación.
 */

/** Formato: `identificación - nombre`; cae a lo que haya si falta una parte. */
export function buildContactoLabel(
  numeroIdentificacion: string | null | undefined,
  nombre: string | null | undefined,
): string {
  return [numeroIdentificacion, nombre].filter(Boolean).join(' - ');
}
