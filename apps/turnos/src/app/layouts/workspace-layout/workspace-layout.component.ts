import { Component, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { I18nService, TenantService } from '@reddoc/core';
import { UserMenuComponent } from '../../shared/user-menu/user-menu.component';
import type { AppDict } from '@turnos/i18n';
import { TenantBadgeComponent } from '../tenant-badge/tenant-badge.component';
import { WORKSPACE_MENU } from './workspace-menu';
import type {
  SidebarAccordion,
  SidebarLeafItem,
  SidebarSection,
  SidebarSimpleItem,
} from './sidebar-menu.types';

/**
 * Layout principal del workspace de un tenant en Turnos.
 *
 * Turnos es una app mono-módulo: el sidebar muestra un menú fijo
 * (`WORKSPACE_MENU`) — no hay topbar de módulos ni módulo activo. Los `path`
 * declarados en el menú son relativos al tenant; el layout les prepende
 * `/t/<slug>/`.
 */
@Component({
  selector: 'app-workspace-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgTemplateOutlet,
    DrawerModule,
    UserMenuComponent,
    TenantBadgeComponent,
  ],
  templateUrl: './workspace-layout.component.html',
  styleUrl: './workspace-layout.component.scss',
})
export class WorkspaceLayoutComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);

  protected readonly t = this.i18n.t;

  /** Slug del tenant activo; necesario para resolver paths absolutos. */
  protected readonly tenantSlug = this.tenant.currentSlug;

  /** Menú fijo del sidebar (mono-módulo). */
  protected readonly sections: readonly SidebarSection[] = WORKSPACE_MENU;

  /** Ids de acordeones expandidos. */
  private readonly expandedAccordionIds = signal<ReadonlySet<string>>(new Set());

  protected readonly drawerVisible = signal(false);

  constructor() {
    // Sembramos como expandidos los acordeones marcados `defaultExpanded: true`
    // y los que contienen la ruta activa. El resto arranca cerrado.
    effect(() => {
      const expandedIds = this.sections
        .filter((s): s is SidebarAccordion => s.kind === 'accordion')
        .filter(
          (s) =>
            s.defaultExpanded === true ||
            s.groups.some((g) => g.items.some((leaf) => this.isLeafActive(leaf))),
        )
        .map((s) => s.id);
      this.expandedAccordionIds.set(new Set(expandedIds));
    });
  }

  // ── API protegida (template) ──────────────────────────────────────────────

  protected isItem(section: SidebarSection): section is SidebarSimpleItem {
    return section.kind === 'item';
  }

  protected asAccordion(section: SidebarSection): SidebarAccordion {
    return section as SidebarAccordion;
  }

  protected isExpanded(accordionId: string): boolean {
    return this.expandedAccordionIds().has(accordionId);
  }

  protected toggleAccordion(accordionId: string): void {
    this.expandedAccordionIds.update((current) => {
      const next = new Set(current);
      if (next.has(accordionId)) next.delete(accordionId);
      else next.add(accordionId);
      return next;
    });
  }

  protected toggleDrawer(): void {
    this.drawerVisible.update((v) => !v);
  }

  /** Path absoluto para un item simple del menú. */
  protected itemPath(item: SidebarSimpleItem): string {
    return this.buildPath(item.path);
  }

  /** Path absoluto para un item dentro de un acordeón. */
  protected leafPath(leaf: SidebarLeafItem): string {
    return this.buildPath(leaf.path);
  }

  /** Indica si un leaf item debe marcarse como activo según la URL actual. */
  protected isLeafActive(leaf: SidebarLeafItem): boolean {
    const parentPath = this.buildPath(this.leafParentPath(leaf.path));
    return this.router.isActive(parentPath, {
      paths: 'subset',
      queryParams: 'ignored',
      matrixParams: 'ignored',
      fragment: 'ignored',
    });
  }

  private leafParentPath(relativePath: string): string {
    const segments = relativePath.split('/');
    return segments.length > 1 ? segments.slice(0, -1).join('/') : relativePath;
  }

  /**
   * Path absoluto a partir de un path relativo al tenant.
   * Turnos no tiene segmento de módulo: `<relativePath>` cuelga directo de
   * `/t/<slug>/`. Sin slug, cae a la raíz.
   */
  private buildPath(relativePath: string): string {
    const slug = this.tenantSlug();
    if (!slug) return `/${relativePath}`;
    return `/t/${slug}/${relativePath}`;
  }

  /**
   * Resuelve una clave i18n con notación de punto contra el diccionario activo.
   * Devuelve la clave misma si no existe — útil para detectar faltantes en dev.
   */
  protected translate(key: string): string {
    const parts = key.split('.');
    let current: unknown = this.t();
    for (const part of parts) {
      if (current === null || typeof current !== 'object') return key;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' ? current : key;
  }
}
