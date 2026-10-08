import { Component, computed, inject } from '@angular/core';
import { I18nService } from '@reddoc/core';
import { ActiveModuleStore } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';

/**
 * Placeholder mostrado cuando un módulo aún no tiene entidades configuradas.
 *
 * Sirve como destino temporal para módulos registrados (Compra, Venta,
 * Inventario) que ya aparecen en el topbar pero todavía no tienen masters
 * ni documentos implementados. Reemplazar por el dashboard del módulo
 * cuando se sumen sus primeras entidades.
 */
@Component({
  selector: 'app-module-placeholder',
  standalone: true,
  template: `
    <div class="module-placeholder">
      <i class="pi pi-clock module-placeholder__icon" aria-hidden="true"></i>
      <h2 class="module-placeholder__title">{{ moduleName() }}</h2>
      <p class="module-placeholder__sub">{{ t().common.comingSoon }}</p>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .module-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 1rem;
        text-align: center;
        color: var(--brand-muted);
        gap: 0.5rem;
      }
      .module-placeholder__icon {
        font-size: 2.25rem;
        color: var(--brand-muted-2);
      }
      .module-placeholder__title {
        margin: 0.25rem 0 0;
        font-size: 1.15rem;
        font-weight: 600;
        color: var(--brand-text);
      }
      .module-placeholder__sub {
        margin: 0;
        font-size: 0.9rem;
      }
    `,
  ],
})
export class ModulePlaceholderComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly activeModule = inject(ActiveModuleStore);

  protected readonly t = this.i18n.t;

  protected readonly moduleName = computed(() => {
    const descriptor = this.activeModule.activeDescriptor();
    if (!descriptor) return '';
    return this.i18n.translate(descriptor.displayNameKey);
  });
}
