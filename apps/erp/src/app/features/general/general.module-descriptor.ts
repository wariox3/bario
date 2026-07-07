import type { ErpModuleDescriptor } from '@erp/core/erp-modules';

export const GENERAL_MODULE: ErpModuleDescriptor = {
  id: 'general',
  displayNameKey: 'modules.general.name',
  iconClass: 'pi pi-cog',
  defaultChildPath: 'inicio',
  menu: [
    { kind: 'item', labelKey: 'layout.nav.home', iconClass: 'pi pi-home', path: 'inicio' },
    {
      kind: 'accordion',
      id: 'general-administracion',
      labelKey: 'layout.nav.sections.master',
      iconClass: 'pi pi-folder',
      defaultExpanded: true,
      groups: [
        {
          items: [
            { labelKey: 'entities.contacto.name', path: 'contactos' },
            { labelKey: 'entities.item.name', path: 'items' },
            { labelKey: 'entities.asesor.name', path: 'asesores' },
            { labelKey: 'entities.cuentaBanco.name', path: 'cuentas-banco' },
            { labelKey: 'entities.precio.name', path: 'precios' },
            { labelKey: 'entities.sede.name', path: 'sedes' },
          ],
        },
      ],
    },
  ],
};
