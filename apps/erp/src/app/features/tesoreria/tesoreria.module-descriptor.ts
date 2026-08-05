import type { ErpModuleDescriptor } from '@erp/core/erp-modules';
import { MODELO } from '@erp/core/permissions/modelo.catalog';

/**
 * Descriptor del módulo Tesorería para la capa de navegación.
 *
 * Los `path` del menú son **relativos al módulo** — el `WorkspaceLayout` les
 * prepende `/t/<slug>/tesoreria/`. Sumar entradas cuando se implementen más
 * masters/documentos.
 */
export const TESORERIA_MODULE: ErpModuleDescriptor = {
  id: 'tesoreria',
  accessFlag: 'acceso_tesoreria',
  displayNameKey: 'modules.tesoreria.name',
  iconClass: 'pi pi-wallet',
  defaultChildPath: 'inicio',
  menu: [
    { kind: 'item', labelKey: 'layout.nav.home', iconClass: 'pi pi-home', path: 'inicio' },
    {
      kind: 'accordion',
      id: 'tesoreria-documentos',
      labelKey: 'layout.nav.sections.document',
      iconClass: 'pi pi-file',
      defaultExpanded: true,
      groups: [
        {
          items: [
            { labelKey: 'entities.egreso.name', path: 'egreso/list', activeMatch: 'egreso' },
            {
              labelKey: 'entities.saldoInicial.name',
              path: 'saldo-inicial/list',
              activeMatch: 'saldo-inicial',
            },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'tesoreria-administracion',
      labelKey: 'layout.nav.sections.master',
      iconClass: 'pi pi-folder',
      defaultExpanded: true,
      groups: [
        {
          // Masters compartidos con el módulo General (no propios de tesorería).
          items: [
            {
              labelKey: 'entities.cuentaBanco.name',
              path: 'cuentas-banco',
              modelo: MODELO.general.cuentaBanco,
            },
            {
              labelKey: 'entities.contacto.name',
              path: 'contactos',
              modelo: MODELO.general.contacto,
            },
          ],
        },
      ],
    },
    {
      kind: 'accordion',
      id: 'tesoreria-informes',
      labelKey: 'layout.nav.sections.report',
      iconClass: 'pi pi-chart-bar',
      defaultExpanded: false,
      groups: [
        {
          items: [
            {
              labelKey: 'entities.cuentaPagar.name',
              path: 'informes/cuenta-pagar',
            },
          ],
        },
      ],
    },
  ],
};
