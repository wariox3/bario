import type { ContenedorAccesoFlags } from './contenedor.model';

/**
 * Prefijo de las flags de acceso por módulo que manda el backend en el
 * contenedor (`acceso_venta`, `acceso_compra`, …).
 */
export const MODULE_ACCESS_PREFIX = 'acceso_';

/**
 * Módulos que el contenedor tiene contratados.
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

export type ContenedorAccesoId =
  | 'venta'
  | 'compra'
  | 'tesoreria'
  | 'cartera'
  | 'inventario'
  | 'humano'
  | 'contabilidad'
  | 'turno';

export interface ContenedorAcceso {
  readonly id: ContenedorAccesoId;
  readonly iconClass: string;
}

/**
 * Accesos por módulo que se pueden otorgar a una persona del contenedor.
 *
 * El `id` es a la vez la clave i18n (`accesosContenedor.flags.<id>`) y el
 * sufijo de la flag que viaja al backend (`acceso_<id>`). El orden es el del
 * topbar del ERP; `turno` va al final porque no es un módulo del ERP sino la
 * app hermana de turnos.
 *
 * `general` no está: es el módulo base, no se contrata ni se otorga.
 */
export const CONTENEDOR_ACCESOS: readonly ContenedorAcceso[] = [
  { id: 'venta', iconClass: 'pi pi-tag' },
  { id: 'compra', iconClass: 'pi pi-shopping-cart' },
  { id: 'tesoreria', iconClass: 'pi pi-wallet' },
  { id: 'cartera', iconClass: 'pi pi-credit-card' },
  { id: 'inventario', iconClass: 'pi pi-box' },
  { id: 'humano', iconClass: 'pi pi-users' },
  { id: 'contabilidad', iconClass: 'pi pi-calculator' },
  { id: 'turno', iconClass: 'pi pi-clock' },
] as const;

export type AccesoFlagName = `${typeof MODULE_ACCESS_PREFIX}${ContenedorAccesoId}`;

/** Nombre de la flag que espera el backend para un acceso del catálogo. */
export const accesoFlag = (id: ContenedorAccesoId): AccesoFlagName =>
  `${MODULE_ACCESS_PREFIX}${id}`;

/**
 * Accesos que se le pueden otorgar a alguien en este contenedor: los del plan.
 *
 * Si el contenedor no trae ninguna flag `acceso_*` no hay contra qué filtrar
 * (ver `readModuleAccessFlags`) y se ofrecen todos — quedarse sin ninguna
 * casilla por un campo que faltó sería peor que ofrecer de más.
 */
export function accesosDisponibles(contenedor: unknown): readonly ContenedorAcceso[] {
  const contratados = readModuleAccessFlags(contenedor);
  if (contratados === null) return CONTENEDOR_ACCESOS;
  return CONTENEDOR_ACCESOS.filter((acceso) => contratados.has(accesoFlag(acceso.id)));
}

/**
 * Flags tal como las espera el backend: **todos** los accesos que el plan del
 * contenedor ofrece, cada uno con su booleano explícito. Los que el plan no
 * incluye no viajan; ese permiso no es de la persona sino de la empresa.
 */
export function buildAccesoFlags(
  contenedor: unknown,
  seleccionados: readonly ContenedorAccesoId[],
): ContenedorAccesoFlags {
  const flags: Record<string, boolean> = {};
  for (const acceso of accesosDisponibles(contenedor)) {
    flags[accesoFlag(acceso.id)] = seleccionados.includes(acceso.id);
  }
  return flags as ContenedorAccesoFlags;
}
