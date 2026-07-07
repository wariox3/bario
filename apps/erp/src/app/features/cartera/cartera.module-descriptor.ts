import type { ErpModuleDescriptor } from '@erp/core/erp-modules';

/**
 * Descriptor del módulo Cartera para la capa de navegación.
 *
 * Los `path` del menú son **relativos al módulo** — el `WorkspaceLayout` les
 * prepende `/t/<slug>/cartera/`. Vacío por ahora: sumar entradas cuando se
 * implementen sus masters/documentos.
 */
export const CARTERA_MODULE: ErpModuleDescriptor = {
  id: 'cartera',
  displayNameKey: 'modules.cartera.name',
  iconClass: 'pi pi-credit-card',
  defaultChildPath: 'inicio',
  menu: [
    { kind: 'item', labelKey: 'layout.nav.home', iconClass: 'pi pi-home', path: 'inicio' },
    {
      kind: 'accordion',
      id: 'cartera-administracion',
      labelKey: 'layout.nav.sections.master',
      iconClass: 'pi pi-folder',
      defaultExpanded: true,
      groups: [
        {
          // Masters compartidos con el módulo General (no propios de cartera).
          items: [
            { labelKey: 'entities.contacto.name', path: 'contactos' },
            { labelKey: 'entities.cuentaBanco.name', path: 'cuentas-banco' },
          ],
        },
      ],
    },
  ],
};
