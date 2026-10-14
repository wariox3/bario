import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@pos/i18n';
import type { PosNavKey } from '../../layouts/workspace-layout/workspace-menu';

/**
 * Marcador de una sección del POS que todavía no se construye. La sección llega
 * por `data` de la ruta (`withComponentInputBinding`) y da el título.
 *
 * Es andamiaje del sprint 0: cada sprint reemplaza su ruta por la página real.
 */
@Component({
  selector: 'app-proximamente',
  standalone: true,
  template: `
    <section class="flex flex-col gap-1">
      <h1 class="text-xl font-semibold text-brand-text">{{ titulo() }}</h1>
      <p class="text-sm text-brand-muted">{{ t().proximamente.desc }}</p>
    </section>
  `,
})
export class ProximamenteComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Sección del sidebar a la que pertenece la ruta. */
  readonly seccion = input.required<PosNavKey>();

  protected readonly titulo = computed(() => this.t().layout.nav[this.seccion()]);
}
