/**
 * Prefijo de las flags de acceso por módulo que manda el backend en el
 * contenedor (`acceso_venta`, `acceso_compra`, …).
 */
export const MODULE_ACCESS_PREFIX = 'acceso_';

/**
 * Módulos que el contenedor activo tiene contratados.
 *
 * `null` significa **sin restricción**: el contenedor no trae ninguna flag
 * `acceso_*`, así que no hay nada contra qué filtrar (un tenant guardado por
 * una versión anterior, u otra app del monorepo que no las use). Distinto de un
 * `Set` vacío, que significaría "no contrató ningún módulo" y dejaría el topbar
 * en blanco — que es exactamente lo que no queremos provocar por un campo que
 * faltó.
 *
 * Cuando sí vienen, se respetan al pie de la letra: solo las que están en
 * `true` habilitan. Una flag en `false` esconde el módulo; una ausente entre
 * otras presentes también, porque el backend ya demostró que las manda.
 *
 * Devuelve los **nombres de flag** (`'acceso_venta'`), no ids de módulo: quién
 * mapea flag → módulo es el `ErpModuleDescriptor`, vía su `accessFlag`.
 */
export function readModuleAccessFlags(contenedor: unknown): ReadonlySet<string> | null {
  if (contenedor === null || typeof contenedor !== 'object') return null;

  const entries = Object.entries(contenedor as Record<string, unknown>).filter(([key]) =>
    key.startsWith(MODULE_ACCESS_PREFIX),
  );
  if (entries.length === 0) return null;

  return new Set(entries.filter(([, value]) => value === true).map(([key]) => key));
}
