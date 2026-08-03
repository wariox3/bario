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
            {
              labelKey: 'entities.salida.name',
              path: 'salida/list',
              activeMatch: 'salida',
            },
            {
              labelKey: 'entities.traslado.name',
              path: 'traslado/list',
              activeMatch: 'traslado',
            },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'inventario-administracion',
      labelKey: 'layout.nav.sections.master',
      iconClass: 'pi pi-folder',
      defaultExpanded: true,
      groups: [
        {
          items: [
            { labelKey: 'entities.item.name', path: 'items' },
            { labelKey: 'entities.almacen.name', path: 'almacenes' },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'inventario-informes',
      labelKey: 'layout.nav.sections.report',
      iconClass: 'pi pi-chart-bar',
      defaultExpanded: false,
      groups: [
        {
          items: [
            { labelKey: 'entities.existencia.name', path: 'informes/existencia' },
            {
              labelKey: 'entities.existenciaAlmacen.name',
              path: 'informes/existencia-almacen',
            },
            {
              labelKey: 'entities.inventarioValorizado.name',
              path: 'informes/inventario-valorizado',
            },
            {
              labelKey: 'entities.historialMovimiento.name',
              path: 'informes/historial-movimiento',
            },
          ],
        },
      ],
    },
  ],
};
