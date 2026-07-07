import type { SidebarSection } from './sidebar-menu.types';

/**
 * Menú del sidebar de la app Turnos.
 *
 * Turnos es una app mono-módulo: el menú es fijo (no depende de un módulo activo).
 * Los `path` son relativos al tenant — el `WorkspaceLayout` les prepende
 * `/t/<slug>/`.
 */
export const WORKSPACE_MENU: readonly SidebarSection[] = [
  { kind: 'item', labelKey: 'layout.nav.home', iconClass: 'pi pi-home', path: 'inicio' },
  {
    kind: 'accordion',
    id: 'turno-movimientos',
    labelKey: 'layout.nav.sections.movement',
    iconClass: 'pi pi-sync',
    defaultExpanded: true,
    groups: [
      {
        items: [
          { labelKey: 'entities.programacion.name', path: 'programaciones' },
          { labelKey: 'entities.soporte.name', path: 'soportes' },
        ],
      },
    ],
  },
  {
    kind: 'accordion',
    id: 'turno-administracion',
    labelKey: 'layout.nav.sections.master',
    iconClass: 'pi pi-folder',
    defaultExpanded: true,
    groups: [
      {
        items: [
          { labelKey: 'entities.puesto.name', path: 'puestos' },
          { labelKey: 'entities.turno.name', path: 'turnos' },
          { labelKey: 'entities.secuencia.name', path: 'secuencias' },
          { labelKey: 'entities.programador.name', path: 'programadores' },
        ],
      },
    ],
  },
  {
    kind: 'accordion',
    id: 'turno-proceso',
    labelKey: 'layout.nav.sections.process',
    iconClass: 'pi pi-sync',
    defaultExpanded: false,
    groups: [
      {
        items: [{ labelKey: 'entities.regenerarHoras.name', path: 'proceso/regenerar-horas' }],
      },
    ],
  },
];
