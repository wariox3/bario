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
            { labelKey: 'entities.contratoServicio.name', path: 'contrato-servicio/list' },
            { labelKey: 'entities.pedidoServicio.name', path: 'pedido-servicio/list' },
            { labelKey: 'entities.facturaVenta.name', path: 'factura-venta/list' },
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
          ],
        },
      ],
    },
  ],
};
