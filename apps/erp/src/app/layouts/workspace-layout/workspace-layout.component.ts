import { Component, computed, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { I18nService, TenantService } from '@reddoc/core';
import { UserMenuComponent } from '../../shared/user-menu/user-menu.component';
import { ActiveModuleStore } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { ModuleBarComponent } from '../module-bar/module-bar.component';
import { TenantBadgeComponent } from '../tenant-badge/tenant-badge.component';
import type {
  SidebarAccordion,
  SidebarLeafItem,
  SidebarSection,
  SidebarSimpleItem,
} from '../sidebar/sidebar-menu.types';

/**
 * Layout principal del workspace de un tenant.
 *
 * El header aloja un topbar de módulos (`<app-module-bar>`) que cambia el
 * módulo activo vía URL. El sidebar se filtra al módulo activo leyendo
 * `ActiveModuleStore.activeDescriptor()` — cada módulo aporta su propio
 * menú vía su `ErpModuleDescriptor`.
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
    ModuleBarComponent,
    TenantBadgeComponent,
  ],
  templateUrl: './workspace-layout.component.html',
  styleUrl: './workspace-layout.component.scss',
})
export class WorkspaceLayoutComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly tenant = inject(TenantService);
  private readonly activeModuleStore = inject(ActiveModuleStore);
  private readonly router = inject(Router);

  protected readonly t = this.i18n.t;

  /** Slug del tenant activo; necesario para resolver paths absolutos. */
  protected readonly tenantSlug = this.tenant.currentSlug;

  /** Descriptor del módulo activo, o `null` si estamos en una ruta global. */
  protected readonly activeDescriptor = this.activeModuleStore.activeDescriptor;

  /** Secciones del sidebar: las del módulo activo, o vacío si no hay módulo. */
  protected readonly sections = computed<readonly SidebarSection[]>(
    () => this.activeDescriptor()?.menu ?? [],
  );

  /** Ids de acordeones expandidos. Reinicia al cambiar de módulo. */
  private readonly expandedAccordionIds = signal<ReadonlySet<string>>(new Set());

  protected readonly drawerVisible = signal(false);

  constructor() {
    // Cada vez que cambia el módulo activo, sembramos como expandidos solo los
    // acordeones marcados `defaultExpanded: true`. El resto arranca cerrado.
    effect(() => {
      const expandedIds = this.sections()
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

  /**
   * Path absoluto para un item simple del menú del módulo activo.
   * Los paths declarados en el descriptor son relativos al módulo —
   * se les prepende `/t/<slug>/<moduleId>/`.
   */
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

  private buildPath(relativePath: string): string {
    const slug = this.tenantSlug();
    const moduleId = this.activeDescriptor()?.id;
    if (!slug) return `/${relativePath}`;
    return moduleId ? `/t/${slug}/${moduleId}/${relativePath}` : `/t/${slug}/${relativePath}`;
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
