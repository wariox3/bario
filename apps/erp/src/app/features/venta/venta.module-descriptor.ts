import type { ErpModuleDescriptor } from '@erp/core/erp-modules';
import { MODELO } from '@erp/core/permissions/modelo.catalog';

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
 *
 * Las entradas que el backend sabe permisar declaran su `modelo`, el mismo que
 * `venta.routes.ts` le pasa a `withPermission`. Las que no lo declaran quedan
 * abiertas: los documentos comparten un único modelo (`general.documento`) y
 * almacén todavía no está catalogado. "Inicio" tampoco lleva: es el landing del
 * módulo, si el módulo se ve el inicio se ve.
 */
export const VENTA_MODULE: ErpModuleDescriptor = {
  id: 'venta',
  accessFlag: 'acceso_venta',
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
              labelKey: 'entities.facturaVentaRecurrente.name',
              path: 'factura-venta-recurrente/list',
              activeMatch: 'factura-venta-recurrente',
            },
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
              labelKey: 'entities.facturaVenta.name',
              path: 'factura-venta/list',
              activeMatch: 'factura-venta',
            },
            {
              labelKey: 'entities.facturaPosElectronica.name',
              path: 'factura-pos-electronica/list',
              activeMatch: 'factura-pos-electronica',
            },
            {
              labelKey: 'entities.facturaPos.name',
              path: 'factura-pos/list',
              activeMatch: 'factura-pos',
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
            {
              labelKey: 'entities.cuentaCobro.name',
              path: 'cuenta-cobro/list',
              activeMatch: 'cuenta-cobro',
            },
            // Los de servicio quedan al final: no venían en el orden pedido.
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
            {
              labelKey: 'entities.contacto.name',
              path: 'contactos',
              modelo: MODELO.general.contacto,
            },
            {
              labelKey: 'entities.item.name',
              path: 'items',
              modelo: MODELO.general.item,
            },
            {
              labelKey: 'entities.almacen.name',
              path: 'almacenes',
            },
            {
              labelKey: 'entities.sede.name',
              path: 'sedes',
              modelo: MODELO.general.sede,
            },
            {
              labelKey: 'entities.precio.name',
              path: 'precios',
              modelo: MODELO.general.precio,
            },
            {
              labelKey: 'entities.asesor.name',
              path: 'asesores',
              modelo: MODELO.general.asesor,
            },
            {
              labelKey: 'entities.resolucion.name',
              path: 'resoluciones',
              modelo: MODELO.general.resolucion,
            },
            {
              labelKey: 'entities.cuentaBanco.name',
              path: 'cuentas-banco',
              modelo: MODELO.general.cuentaBanco,
            },
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
      id: 'venta-utilidades',
      labelKey: 'layout.nav.sections.utility',
      iconClass: 'pi pi-bolt',
      defaultExpanded: false,
      groups: [
        {
          items: [
            {
              labelKey: 'entities.enviarFacturaElectronica.name',
              path: 'utilidades/enviar-factura-electronica',
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
            {
              labelKey: 'entities.cuentaCobrar.name',
              path: 'informes/cuenta-cobrar',
            },
          ],
        },
      ],
    },
  ],
};
