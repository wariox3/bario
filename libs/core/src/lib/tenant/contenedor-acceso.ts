import type { ContenedorAccess } from './tenant.types';

/**
 * Prefijo de las flags de acceso por módulo (`acceso_venta`, `acceso_compra`, …).
 * El backend ya no las manda: hoy las deriva `readModuleAccessFlags` de los
 * grupos, y siguen siendo el idioma de los descriptores del ERP y de los guards.
 */
export const MODULE_ACCESS_PREFIX = 'acceso_';

export type ContenedorAccesoId =
  | 'venta'
  | 'compra'
  | 'tesoreria'
  | 'cartera'
  | 'inventario'
  | 'humano'
  | 'contabilidad'
  | 'turno';

export type AccesoFlagName = `${typeof MODULE_ACCESS_PREFIX}${ContenedorAccesoId}`;

/** Nombre de la flag de un acceso del catálogo. */
export const accesoFlag = (id: ContenedorAccesoId): AccesoFlagName =>
  `${MODULE_ACCESS_PREFIX}${id}`;

/**
 * Grupo de seguridad → acceso. Los ids son fijos en todos los contenedores
 * (los siembra el backend al crearlos), así que el mapa vive acá y no se
 * consulta. Un `Map` y no un objeto: `get()` responde `undefined` para un grupo
 * que no abre ningún módulo, y el tipo lo dice.
 */
export const GRUPO_ACCESO: ReadonlyMap<number, ContenedorAccesoId> = new Map([
  [1, 'venta'],
  [2, 'compra'],
  [3, 'tesoreria'],
  [4, 'cartera'],
  [5, 'inventario'],
  [6, 'humano'],
  [7, 'contabilidad'],
  [8, 'turno'],
]);

/** El contenedor activo, o lo mínimo de él que decide los accesos. */
type AccesoDeMembresia = Pick<ContenedorAccess, 'grupos' | 'propietario'> &
  Partial<Pick<ContenedorAccess, 'soporte' | 'is_superuser'>>;

/**
 * Accesos del usuario en el contenedor activo, como nombres de flag
 * (`'acceso_venta'`). Quién mapea flag → módulo es el `ErpModuleDescriptor`
 * (vía su `accessFlag`) o el guard de cada app.
 *
 * **Se decide por los grupos de la membresía**, que mandan tanto `lista-usuario`
 * como `/seguridad/usuario-cliente/usuario/`: cada grupo de `GRUPO_ACCESO`
 * habilita su módulo y los demás no habilitan nada. Un `Set` vacío deja solo
 * General.
 *
 * `null` significa **sin restricción**:
 *  - sin contenedor en memoria (todavía no se validó; los guards de acceso
 *    corren después de `tenantAccessGuard`);
 *  - propietario, superusuario o membresía de soporte: no se les cierra ningún
 *    módulo de su propia empresa, ni al staff que entra a ayudar.
 */
export function readModuleAccessFlags(
  contenedor: AccesoDeMembresia | null,
): ReadonlySet<AccesoFlagName> | null {
  if (contenedor === null) return null;
  if (contenedor.propietario || contenedor.is_superuser || contenedor.soporte) return null;

  const flags = new Set<AccesoFlagName>();
  for (const grupo of contenedor.grupos) {
    const acceso = GRUPO_ACCESO.get(grupo);
    if (acceso !== undefined) flags.add(accesoFlag(acceso));
  }
  return flags;
}
