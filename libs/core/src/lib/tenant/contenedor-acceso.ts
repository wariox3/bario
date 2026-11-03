/**
 * Prefijo de las flags de acceso por módulo que manda el backend en el
 * contenedor (`acceso_venta`, `acceso_compra`, …).
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

/**
 * Grupo de seguridad → acceso. Los ids son fijos en todos los contenedores
 * (los siembra el backend al crearlos), así que el mapa vive acá y no se
 * consulta.
 */
export const GRUPO_ACCESO: Readonly<Record<number, ContenedorAccesoId>> = {
  1: 'venta',
  2: 'compra',
  3: 'tesoreria',
  4: 'cartera',
  5: 'inventario',
  6: 'humano',
  7: 'contabilidad',
  8: 'turno',
};

/**
 * Accesos del usuario en el contenedor activo, como nombres de flag
 * (`'acceso_venta'`). Quién mapea flag → módulo es el `ErpModuleDescriptor`
 * (vía su `accessFlag`) o el guard de cada app.
 *
 * **Se decide por los grupos de la membresía** (`grupos`, que mandan tanto
 * `lista-usuario` como `/seguridad/usuario-cliente/usuario/`): cada grupo de
 * `GRUPO_ACCESO` habilita su módulo; los demás grupos no habilitan nada.
 *
 * `null` significa **sin restricción**, y sale en dos casos:
 *  - propietario, superusuario o membresía de soporte: no se les cierra ningún
 *    módulo de su propia empresa (ni al staff que entra a ayudar);
 *  - el contenedor no trae `grupos` ni flags `acceso_*` (un tenant de una
 *    versión anterior, u otra app que no los use). Distinto de un `Set` vacío,
 *    que sí significa "ningún módulo" y deja solo General.
 *
 * Sin `grupos` pero con flags `acceso_*` (lo que mandaba antes el backend), se
 * respetan las flags: solo las que están en `true` habilitan.
 */
export function readModuleAccessFlags(contenedor: unknown): ReadonlySet<string> | null {
  if (contenedor === null || typeof contenedor !== 'object') return null;
  const datos = contenedor as Record<string, unknown>;

  if (Array.isArray(datos['grupos'])) {
    if (
      datos['propietario'] === true ||
      datos['is_superuser'] === true ||
      datos['soporte'] === true
    ) {
      return null;
    }
    return new Set(
      datos['grupos']
        .map((grupo) => (typeof grupo === 'number' ? GRUPO_ACCESO[grupo] : undefined))
        .filter((acceso): acceso is ContenedorAccesoId => acceso !== undefined)
        .map(accesoFlag),
    );
  }

  const entries = Object.entries(datos).filter(([key]) => key.startsWith(MODULE_ACCESS_PREFIX));
  if (entries.length === 0) return null;

  return new Set(entries.filter(([, value]) => value === true).map(([key]) => key));
}

export type AccesoFlagName = `${typeof MODULE_ACCESS_PREFIX}${ContenedorAccesoId}`;

/** Nombre de la flag que espera el backend para un acceso del catálogo. */
export const accesoFlag = (id: ContenedorAccesoId): AccesoFlagName =>
  `${MODULE_ACCESS_PREFIX}${id}`;
