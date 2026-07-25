import type { ErpModuleDescriptor } from '@erp/core/erp-modules';

export const INVENTARIO_MODULE: ErpModuleDescriptor = {
  id: 'inventario',
  displayNameKey: 'modules.inventario.name',
  iconClass: 'pi pi-box',
  defaultChildPath: 'inicio',
  menu: [
    { kind: 'item', labelKey: 'layout.nav.home', iconClass: 'pi pi-home', path: 'inicio' },
    {
      kind: 'accordion',
      id: 'inventario-documentos',
      labelKey: 'layout.nav.sections.document',
      iconClass: 'pi pi-file',
      defaultExpanded: true,
      groups: [
        {
          items: [
            {
              labelKey: 'entities.entrada.name',
              path: 'entrada/list',
              activeMatch: 'entrada',
            },
          ],
        },
      ],
    },
  ],
};
