export { PermissionsService } from './permissions.service';
export type { ActionPredicate, ModelGrants, PermissionAction } from './permission.types';
export { MODELO, type ModeloId } from './modelo.catalog';
export { ModelPermissionsService } from './model-permissions.service';
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
