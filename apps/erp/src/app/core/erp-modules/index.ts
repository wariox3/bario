export type { ErpModuleDescriptor } from './erp-module.types';
export type {
  SidebarAccordion,
  SidebarGroup,
  SidebarLeafItem,
  SidebarSection,
  SidebarSimpleItem,
} from './sidebar-menu.types';
export { ERP_MODULES, ERP_HIDDEN_MODULES, ERP_ALL_MODULES } from './erp-modules.registry';
export { ActiveModuleStore } from './active-module.store';
export { currentModuleId, resolveModuleName } from './active-module-nav';
export { masterNav, SinTenantActivoError, type MasterNav } from './master-nav';
export { documentoBreadcrumb } from './documento-breadcrumb';
export { erpModuleResolver } from './active-module.resolver';
export { moduleIndexRoute, ModuleDescriptorError } from './module-index-route';
