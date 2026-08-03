/**
 * Roles del usuario **dentro de un contenedor**. Los ids los define el backend y
 * viajan en `ContenedorAccess.rol_id` (poblado por `tenantAccessGuard`).
 *
 * No confundir con los permisos por módulo (`PermissionsService.enabledModuleIds`),
 * que dependen del plan del contenedor y no de quién sos vos dentro de él.
 */
export const CONTENEDOR_ROL = {
  propietario: 1,
  administrador: 2,
  usuario: 3,
} as const;

export type ContenedorRolId = (typeof CONTENEDOR_ROL)[keyof typeof CONTENEDOR_ROL];

/** Roles que administran el contenedor: ven y gestionan sus usuarios. */
export const ROL_ADMIN_IDS: ReadonlySet<number> = new Set<number>([
  CONTENEDOR_ROL.propietario,
  CONTENEDOR_ROL.administrador,
]);
