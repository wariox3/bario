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
      id: 'general-documentos',
      labelKey: 'layout.nav.sections.document',
      iconClass: 'pi pi-file',
      defaultExpanded: true,
      groups: [
        {
          items: [
            { labelKey: 'entities.facturaVenta.name', path: 'factura-venta/list' },
            { labelKey: 'entities.facturaCompra.name', path: 'factura-compra/list' },
            { labelKey: 'entities.pago.name', path: 'pago/list' },
            { labelKey: 'entities.egreso.name', path: 'egreso/list' },
          ],
        },
      ],
    },
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
    {
      kind: 'accordion',
      id: 'general-informes',
      labelKey: 'layout.nav.sections.report',
      iconClass: 'pi pi-chart-bar',
      defaultExpanded: false,
      groups: [
        {
          items: [
            {
              labelKey: 'entities.ventaItem.name',
              path: 'informes/venta-item',
            },
          ],
        },
      ],
    },
  ],
};
