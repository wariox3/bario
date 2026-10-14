export { PermissionsService } from './permissions.service';
// El núcleo (permisos por modelo y catálogo de modelos) vive en `@reddoc/core`
// porque también lo usa el POS; se re-exporta para que el ERP lo siga pidiendo acá.
export { MODELO, PERMISO_APPS, ModelPermissionsService } from '@reddoc/core';
export type { ActionPredicate, ModelGrants, ModeloId, PermissionAction } from '@reddoc/core';
export { PERMISSION_ROUTE_DATA_KEY, permissionGuard } from './permission.guard';
export { withPermission } from './with-permission';
export { withModuleAccess } from './with-module-access';
export { MODULE_ACCESS_ROUTE_DATA_KEY, moduleAccessGuard } from './module-access.guard';
export {
  ACCESS_DENIED_VARIANT_KEY,
  ProtectedRouteError,
  accessDeniedTwin,
  type AccessDeniedVariant,
} from './access-denied-route';
export {
  collectPermissions,
  hasVisibleMenu,
  visibleSections,
  type PermissionPredicate,
} from './menu-visibility';
export { ACTION_PERMISSION_BY_ID, visibleActions, visiblePrimaryAction } from './action-visibility';
export { masterActions } from './master-actions';
export type { MasterActions, MasterActionsConfig } from './master-actions';
export { HasPermissionDirective } from './has-permission.directive';
