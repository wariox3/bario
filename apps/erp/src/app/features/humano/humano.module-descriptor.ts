import type { ErpModuleDescriptor } from '@erp/core/erp-modules';

/**
 * Descriptor del módulo Humano para la capa de navegación.
 *
 * Los `path` del menú son **relativos al módulo** — el `WorkspaceLayout` les
 * prepende `/t/<slug>/humano/`. Sumar entradas cuando se implementen más
 * masters/documentos.
 */
export const HUMANO_MODULE: ErpModuleDescriptor = {
  id: 'humano',
  displayNameKey: 'modules.humano.name',
  iconClass: 'pi pi-users',
  defaultChildPath: 'inicio',
  menu: [
    { kind: 'item', labelKey: 'layout.nav.home', iconClass: 'pi pi-home', path: 'inicio' },
    {
      kind: 'accordion',
      id: 'humano-documentos',
      labelKey: 'layout.nav.sections.document',
      iconClass: 'pi pi-file',
      defaultExpanded: true,
      groups: [
        {
          items: [
            // `activeMatch` exacto: `nomina` a secas tambien casaria con
            // `nomina-electronica` y quedarian las dos marcadas a la vez.
            { labelKey: 'entities.nomina.name', path: 'nomina/list', activeMatch: 'nomina/' },
            {
              labelKey: 'entities.nominaElectronica.name',
              path: 'nomina-electronica/list',
              activeMatch: 'nomina-electronica',
            },
            {
              labelKey: 'entities.seguridadSocial.name',
              path: 'seguridad-social/list',
              activeMatch: 'seguridad-social',
            },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'humano-proceso',
      labelKey: 'layout.nav.sections.process',
      iconClass: 'pi pi-cog',
      defaultExpanded: true,
      groups: [
        {
          items: [
            {
              labelKey: 'entities.programacion.name',
              path: 'proceso/programacion',
              activeMatch: 'proceso/programacion',
            },
            {
              labelKey: 'entities.aporte.name',
              path: 'proceso/aporte',
              activeMatch: 'proceso/aporte',
            },
            {
              labelKey: 'entities.liquidacion.name',
              path: 'proceso/liquidacion',
              activeMatch: 'proceso/liquidacion',
            },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'humano-informes',
      labelKey: 'layout.nav.sections.report',
      iconClass: 'pi pi-chart-bar',
      defaultExpanded: false,
      groups: [
        {
          items: [
            {
              labelKey: 'entities.nominaInforme.name',
              path: 'informes/nomina',
            },
            {
              labelKey: 'entities.nominaDetalleInforme.name',
              path: 'informes/nomina-detalle',
            },
            {
              labelKey: 'entities.nominaElectronicaInforme.name',
              path: 'informes/nomina-electronica',
            },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'humano-utilidades',
      labelKey: 'layout.nav.sections.utility',
      iconClass: 'pi pi-bolt',
      defaultExpanded: false,
      groups: [
        {
          items: [
            {
              labelKey: 'entities.enviarNominaElectronica.name',
              path: 'utilidades/enviar-nomina-electronica',
            },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'humano-administracion',
      labelKey: 'layout.nav.sections.master',
      iconClass: 'pi pi-folder',
      defaultExpanded: true,
      groups: [
        {
          items: [
            { labelKey: 'entities.empleado.name', path: 'empleados' },
            { labelKey: 'entities.contrato.name', path: 'contratos' },
            { labelKey: 'entities.cargo.name', path: 'cargos' },
            { labelKey: 'entities.grupo.name', path: 'grupos' },
            { labelKey: 'entities.sucursal.name', path: 'sucursales' },
            { labelKey: 'entities.adicional.name', path: 'adicionales' },
            { labelKey: 'entities.credito.name', path: 'creditos' },
            { labelKey: 'entities.novedad.name', path: 'novedades' },
          ],
        },
      ],
    },
  ],
};
