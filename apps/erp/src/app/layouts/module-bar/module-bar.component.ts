import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService, TenantService } from '@reddoc/core';
import { ActiveModuleStore, ERP_MODULES, type ErpModuleDescriptor } from '@erp/core/erp-modules';
import { PermissionsService, hasVisibleMenu, type ModeloId } from '@erp/core/permissions';
import type { AppDict } from '@erp/i18n';

interface VisibleModule {
  readonly id: string;
  readonly label: string;
  readonly iconClass: string;
  readonly targetPath: string;
  readonly isActive: boolean;
}

/**
 * Topbar de módulos del ERP.
 *
 * Vive en el header del `WorkspaceLayout`. Renderiza un link por cada módulo
 * habilitado para el tenant activo (filtrado por `PermissionsService`) y
 * marca como activo el que está en `ActiveModuleStore`.
 *
 * Cada link apunta a `/t/<slug>/<moduleId>`; el resolver de ese módulo y/o
 * su `''` redirect llevan al destino real (master/documento por defecto o
 * placeholder).
 */
@Component({
  selector: 'app-module-bar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './module-bar.component.html',
  styleUrl: './module-bar.component.scss',
})
export class ModuleBarComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly tenant = inject(TenantService);
  private readonly permissions = inject(PermissionsService);
  private readonly activeModule = inject(ActiveModuleStore);

  private readonly t = this.i18n.t;

  protected readonly modules = computed<readonly VisibleModule[]>(() => {
    const slug = this.tenant.currentSlug();
    if (!slug) return [];
    const activeId = this.activeModule.activeId();
    const can = (modelo?: ModeloId) => this.permissions.canShowInMenu(modelo);
    // Dos filtros distintos: el plan del tenant dice si el módulo existe, los
    // permisos del usuario dicen si le queda algo adentro. Un módulo del plan
    // sin ninguna entrada alcanzable abre a un sidebar vacío — no se muestra.
    return ERP_MODULES.filter(
      (m) => this.permissions.canAccessModule(m.id) && hasVisibleMenu(m.menu, can),
    ).map((m) => this.toVisible(m, slug, activeId));
  });

  private toVisible(
    descriptor: ErpModuleDescriptor,
    slug: string,
    activeId: string | null,
  ): VisibleModule {
    return {
      id: descriptor.id,
      label: this.translate(descriptor.displayNameKey),
      iconClass: descriptor.iconClass,
      targetPath: `/t/${slug}/${descriptor.id}`,
      isActive: descriptor.id === activeId,
    };
  }

  private translate(key: string): string {
    const parts = key.split('.');
    let current: unknown = this.t();
    for (const part of parts) {
      if (current === null || typeof current !== 'object') return key;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' ? current : key;
  }
}
