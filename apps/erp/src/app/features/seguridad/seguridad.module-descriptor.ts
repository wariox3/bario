import type { ErpModuleDescriptor } from '@erp/core/erp-modules';

/**
 * Descriptor de Seguridad para la capa de navegación.
 *
 * Seguridad se administra como cualquier otra área del ERP, así que usa el
 * mismo chrome: sidebar del workspace + páginas de lista con breadcrumb. Por eso
 * declara un `ErpModuleDescriptor` en vez de inventarse un menú lateral propio.
 *
 * **No va en el topbar**: se entra por el menú del perfil y solo la ven los
 * administradores del contenedor. Vive en `ERP_HIDDEN_MODULES`, que alimenta al
 * `ActiveModuleStore` (y por tanto al sidebar) pero no a `<app-module-bar>`.
 *
 * Las secciones que vengan (roles, auditoría, sesiones) se suman acá más su
 * ruta hija en `SEGURIDAD_ROUTES`.
 */
export const SEGURIDAD_MODULE: ErpModuleDescriptor = {
  id: 'seguridad',
  // Reusa la clave que ya nombra la pantalla en vez de duplicar el literal en
  // `modules.seguridad.name`: no es un módulo del topbar, no necesita ese slot.
  displayNameKey: 'seguridad.title',
  iconClass: 'pi pi-shield',
  defaultChildPath: 'inicio',
  menu: [
    { kind: 'item', labelKey: 'layout.nav.home', iconClass: 'pi pi-home', path: 'inicio' },
    {
      kind: 'item',
      labelKey: 'seguridad.menu.usuarios',
      iconClass: 'pi pi-users',
      path: 'usuarios',
    },
  ],
};
