import { Injectable, computed, inject } from '@angular/core';
import { I18nService, TenantService } from '@reddoc/core';
import { ActiveModuleStore, ERP_MODULES, type ErpModuleDescriptor } from '@erp/core/erp-modules';
import { PermissionsService, hasVisibleMenu, type ModeloId } from '@erp/core/permissions';
import type { AppDict } from '@erp/i18n';

export interface VisibleModule {
  readonly id: string;
  readonly label: string;
  readonly iconClass: string;
  readonly targetPath: string;
  readonly isActive: boolean;
}

/**
 * Módulos que el usuario puede abrir en el tenant activo.
 *
 * Fuente única para las dos maneras de cambiar de módulo: el topbar en
 * escritorio (`<app-module-bar>`) y el selector del drawer en móvil
 * (`<app-module-picker>`). Así ambos aplican el mismo filtro de plan y permisos.
 */
@Injectable({ providedIn: 'root' })
export class VisibleModulesStore {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly tenant = inject(TenantService);
  private readonly permissions = inject(PermissionsService);
  private readonly activeModule = inject(ActiveModuleStore);

  readonly modules = computed<readonly VisibleModule[]>(() => {
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

  /**
   * Módulo activo, incluidas las áreas que no van en el topbar (Seguridad):
   * el selector del drawer las nombra igual aunque no las ofrezca en la grilla.
   */
  readonly active = computed<VisibleModule | null>(() => {
    const descriptor = this.activeModule.activeDescriptor();
    const slug = this.tenant.currentSlug();
    if (!descriptor || !slug) return null;
    return this.toVisible(descriptor, slug, descriptor.id);
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
    let current: unknown = this.i18n.t();
    for (const part of parts) {
      if (current === null || typeof current !== 'object') return key;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' ? current : key;
  }
}
