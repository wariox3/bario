/** Separador entre la ciudad y su departamento. */
const SEPARADOR = ' — ';

/**
 * Etiqueta de una ciudad con su departamento: `Albania — La Guajira`.
 *
 * No es decoración: en Colombia hay municipios homónimos en departamentos
 * distintos —Albania está en La Guajira, Santander y Caquetá; La Unión en cuatro—
 * así que sin el departamento el usuario elige a ciegas entre opciones idénticas
 * y nada le avisa si se equivoca.
 *
 * Sin departamento devuelve solo el nombre: es el mismo texto que se usa al
 * elegir en el buscador y al reabrir un registro guardado, y no puede aparecer un
 * separador colgando cuando el catálogo no trae el dato.
 */
export function formatCiudad(
  nombre: string | null | undefined,
  departamento?: string | null,
): string {
  const ciudad = nombre?.trim() ?? '';
  const depto = departamento?.trim() ?? '';
  if (!ciudad) return '';
  return depto ? `${ciudad}${SEPARADOR}${depto}` : ciudad;
}
