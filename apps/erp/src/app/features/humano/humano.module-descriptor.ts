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
