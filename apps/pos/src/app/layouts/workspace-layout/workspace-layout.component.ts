import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { I18nService, TenantService } from '@reddoc/core';
import { AppSwitcherComponent } from '@reddoc/ui';
import type { AppDict } from '@pos/i18n';
import { UserMenuComponent } from '../../shared/user-menu/user-menu.component';
import { TenantBadgeComponent } from '../tenant-badge/tenant-badge.component';
import { WORKSPACE_MENU, type PosNavItem } from './workspace-menu';

/**
 * Layout del workspace de un tenant en el POS: header con la empresa activa,
 * sidebar con las secciones de la caja y el `router-outlet`.
 *
 * Mismo esqueleto que el workspace de turnos (header, sidebar fijo, drawer en
 * móvil), con un menú plano: el POS no tiene acordeones ni módulos.
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
    AppSwitcherComponent,
    TenantBadgeComponent,
  ],
  templateUrl: './workspace-layout.component.html',
  styleUrl: './workspace-layout.component.scss',
})
export class WorkspaceLayoutComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly tenant = inject(TenantService);

  protected readonly t = this.i18n.t;
  protected readonly items = WORKSPACE_MENU;
  protected readonly drawerVisible = signal(false);

  protected toggleDrawer(): void {
    this.drawerVisible.update((v) => !v);
  }

  /** Path absoluto del item: cuelga directo de `/t/<slug>/`. Sin slug, de la raíz. */
  protected itemPath(item: PosNavItem): string {
    const slug = this.tenant.currentSlug();
    return slug ? `/t/${slug}/${item.path}` : `/${item.path}`;
  }
}
