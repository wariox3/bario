import type { ErpModuleDescriptor } from '@erp/core/erp-modules';
import { MODELO } from '@erp/core/permissions/modelo.catalog';

/**
 * Descriptor del módulo Humano para la capa de navegación.
 *
 * Los `path` del menú son **relativos al módulo** — el `WorkspaceLayout` les
 * prepende `/t/<slug>/humano/`. Sumar entradas cuando se implementen más
 * masters/documentos.
 */
export const HUMANO_MODULE: ErpModuleDescriptor = {
  id: 'humano',
  accessFlag: 'acceso_humano',
  displayNameKey: 'modules.humano.name',
  iconClass: 'pi pi-users',
  defaultChildPath: 'inicio',
  menu: [
    { kind: 'item', labelKey: 'layout.nav.home', iconClass: 'pi pi-home', path: 'inicio' },
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
      id: 'humano-administracion',
      labelKey: 'layout.nav.sections.master',
      iconClass: 'pi pi-folder',
      defaultExpanded: true,
      groups: [
        {
          items: [
            // Empleados usa `ContactoService`: mismo modelo que Contactos.
            {
              labelKey: 'entities.empleado.name',
              path: 'empleados',
              modelo: MODELO.general.contacto,
            },
            {
              labelKey: 'entities.contrato.name',
              path: 'contratos',
              modelo: MODELO.humano.contrato,
            },
            { labelKey: 'entities.cargo.name', path: 'cargos', modelo: MODELO.humano.cargo },
            { labelKey: 'entities.grupo.name', path: 'grupos', modelo: MODELO.humano.grupo },
            {
              labelKey: 'entities.sucursal.name',
              path: 'sucursales',
              modelo: MODELO.humano.sucursal,
            },
            {
              labelKey: 'entities.adicional.name',
              path: 'adicionales',
              modelo: MODELO.humano.adicional,
            },
            { labelKey: 'entities.credito.name', path: 'creditos', modelo: MODELO.humano.credito },
            { labelKey: 'entities.novedad.name', path: 'novedades', modelo: MODELO.humano.novedad },
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
  ],
};
