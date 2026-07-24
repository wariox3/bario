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
            {
              labelKey: 'entities.facturaCompraRecurrente.name',
              path: 'factura-compra-recurrente/list',
              activeMatch: 'factura-compra-recurrente',
            },
            {
              labelKey: 'entities.facturaCompra.name',
              path: 'factura-compra/list',
              activeMatch: 'factura-compra',
            },
            {
              labelKey: 'entities.documentoSoporte.name',
              path: 'documento-soporte/list',
              activeMatch: 'documento-soporte',
            },
            {
              labelKey: 'entities.notaCreditoCompra.name',
              path: 'nota-credito-compra/list',
              activeMatch: 'nota-credito-compra',
            },
            {
              labelKey: 'entities.notaDebitoCompra.name',
              path: 'nota-debito-compra/list',
              activeMatch: 'nota-debito-compra',
            },

            {
              labelKey: 'entities.notaAjuste.name',
              path: 'nota-ajuste/list',
              activeMatch: 'nota-ajuste',
            },
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
    {
      kind: 'accordion',
      id: 'compra-utilidades',
      labelKey: 'layout.nav.sections.utility',
      iconClass: 'pi pi-bolt',
      defaultExpanded: false,
      groups: [
        {
          items: [
            {
              labelKey: 'entities.documentoElectronico.name',
              path: 'utilidades/documento-electronico',
            },
            {
              labelKey: 'entities.eventosDian.name',
              path: 'utilidades/eventos-dian',
            },
          ],
        },
      ],
    },
  ],
};
