import type { ErpModuleDescriptor } from '@erp/core/erp-modules';

/**
 * Descriptor del módulo Venta para la capa de navegación.
 *
 * El menú declara los acordeones que ve el sidebar cuando este módulo está
 * activo. Los `path` son **relativos al módulo** — el `WorkspaceLayout`
 * les prepende `/t/<slug>/venta/`.
 *
 * Acordeones: "Documentos" (contrato/pedido/factura de servicio), "Proceso" e
 * "Informes" (Pendiente por facturar). Sumar entradas a `items` (o nuevos
 * grupos/acordeones) cuando se implementen más documentos, procesos o informes.
 */
export const VENTA_MODULE: ErpModuleDescriptor = {
  id: 'venta',
  displayNameKey: 'modules.venta.name',
  iconClass: 'pi pi-tag',
  defaultChildPath: 'inicio',
  menu: [
    { kind: 'item', labelKey: 'layout.nav.home', iconClass: 'pi pi-home', path: 'inicio' },
    {
      kind: 'accordion',
      id: 'venta-documentos',
      labelKey: 'layout.nav.sections.document',
      iconClass: 'pi pi-file',
      defaultExpanded: true,
      groups: [
        {
          items: [
            {
              labelKey: 'entities.pedidoCliente.name',
              path: 'pedido-cliente/list',
              activeMatch: 'pedido-cliente',
            },
            {
              labelKey: 'entities.remision.name',
              path: 'remision/list',
              activeMatch: 'remision',
            },
            {
              labelKey: 'entities.contratoServicio.name',
              path: 'contrato-servicio/list',
              activeMatch: 'contrato-servicio',
            },
            {
              labelKey: 'entities.pedidoServicio.name',
              path: 'pedido-servicio/list',
              activeMatch: 'pedido-servicio',
            },
            {
              labelKey: 'entities.facturaVenta.name',
              path: 'factura-venta/list',
              activeMatch: 'factura-venta',
            },
            {
              labelKey: 'entities.facturaPos.name',
              path: 'factura-pos/list',
              activeMatch: 'factura-pos',
            },
            {
              labelKey: 'entities.facturaPosElectronica.name',
              path: 'factura-pos-electronica/list',
              activeMatch: 'factura-pos-electronica',
            },
            {
              labelKey: 'entities.cuentaCobro.name',
              path: 'cuenta-cobro/list',
              activeMatch: 'cuenta-cobro',
            },
            {
              labelKey: 'entities.facturaVentaRecurrente.name',
              path: 'factura-venta-recurrente/list',
              activeMatch: 'factura-venta-recurrente',
            },
            {
              labelKey: 'entities.notaCredito.name',
              path: 'nota-credito/list',
              activeMatch: 'nota-credito',
            },
            {
              labelKey: 'entities.notaDebito.name',
              path: 'nota-debito/list',
              activeMatch: 'nota-debito',
            },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'venta-administracion',
      labelKey: 'layout.nav.sections.master',
      iconClass: 'pi pi-folder',
      defaultExpanded: false,
      groups: [
        {
          items: [
            { labelKey: 'entities.contacto.name', path: 'contactos' },
            { labelKey: 'entities.item.name', path: 'items' },
            // sede: pendiente (el master aún no existe)
            { labelKey: 'entities.precio.name', path: 'precios' },
            { labelKey: 'entities.asesor.name', path: 'asesores' },
            { labelKey: 'entities.resolucion.name', path: 'resoluciones' },
            { labelKey: 'entities.cuentaBanco.name', path: 'cuentas-banco' },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'venta-proceso',
      labelKey: 'layout.nav.sections.process',
      iconClass: 'pi pi-sync',
      defaultExpanded: false,
      groups: [
        {
          items: [
            {
              labelKey: 'entities.regenerarAfectado.name',
              path: 'proceso/regenerar-afectado',
            },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'venta-informes',
      labelKey: 'layout.nav.sections.report',
      iconClass: 'pi pi-chart-bar',
      defaultExpanded: false,
      groups: [
        {
          items: [
            {
              labelKey: 'entities.pendienteFacturar.name',
              path: 'informes/pendiente-facturar',
            },
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
