import type { ErpModuleDescriptor } from '@erp/core/erp-modules';

export const COMPRA_MODULE: ErpModuleDescriptor = {
  id: 'compra',
  displayNameKey: 'modules.compra.name',
  iconClass: 'pi pi-shopping-cart',
  defaultChildPath: 'inicio',
  menu: [
    { kind: 'item', labelKey: 'layout.nav.home', iconClass: 'pi pi-home', path: 'inicio' },
    {
      kind: 'accordion',
      id: 'compra-documentos',
      labelKey: 'layout.nav.sections.document',
      iconClass: 'pi pi-file',
      defaultExpanded: true,
      groups: [
        {
          items: [
            { labelKey: 'entities.facturaCompra.name', path: 'factura-compra/list' },
            { labelKey: 'entities.documentoSoporte.name', path: 'documento-soporte/list' },
            { labelKey: 'entities.notaCreditoCompra.name', path: 'nota-credito-compra/list' },
            { labelKey: 'entities.notaAjuste.name', path: 'nota-ajuste/list' },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'compra-administracion',
      labelKey: 'layout.nav.sections.master',
      iconClass: 'pi pi-folder',
      defaultExpanded: true,
      groups: [
        {
          items: [
            { labelKey: 'entities.item.name', path: 'items' },
            { labelKey: 'entities.contacto.name', path: 'contactos' },
            { labelKey: 'entities.resolucion.name', path: 'resoluciones' },
            { labelKey: 'entities.formaPago.name', path: 'formas-pago' },
          ],
        },
      ],
    },
  ],
};
