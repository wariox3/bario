import type { ErpModuleDescriptor } from '@erp/core/erp-modules';

/**
 * Descriptor del módulo Tesorería para la capa de navegación.
 *
 * Los `path` del menú son **relativos al módulo** — el `WorkspaceLayout` les
 * prepende `/t/<slug>/tesoreria/`. Vacío por ahora: sumar entradas cuando se
 * implementen sus masters/documentos.
 */
export const TESORERIA_MODULE: ErpModuleDescriptor = {
  id: 'tesoreria',
  displayNameKey: 'modules.tesoreria.name',
  iconClass: 'pi pi-wallet',
  defaultChildPath: 'inicio',
  menu: [
    { kind: 'item', labelKey: 'layout.nav.home', iconClass: 'pi pi-home', path: 'inicio' },
    {
      kind: 'accordion',
      id: 'tesoreria-administracion',
      labelKey: 'layout.nav.sections.master',
      iconClass: 'pi pi-folder',
      defaultExpanded: true,
      groups: [
        {
          // Masters compartidos con el módulo General (no propios de tesorería).
          items: [
            { labelKey: 'entities.contacto.name', path: 'contactos' },
            { labelKey: 'entities.cuentaBanco.name', path: 'cuentas-banco' },
          ],
        },
      ],
    },
  ],
};
