import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { RESUMEN_PERIODOS, type ResumenPeriodo } from './resumen-periodo';

/**
 * Selector mes / año de las gráficas de los inicios. Segmentado y no dropdown:
 * son dos opciones y se cambia de un clic, viéndolas a ambas.
 */
@Component({
  selector: 'app-periodo-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = t().inicio.periodo;
    <div
      class="inline-flex rounded-lg border border-[rgba(20,48,73,0.12)] bg-brand-surface p-0.5"
      role="radiogroup"
      [attr.aria-label]="p.aria"
    >
      @for (opcion of periodos; track opcion) {
        <button
          type="button"
          role="radio"
          class="rounded-md px-3 py-1 text-[0.78rem] font-medium transition-colors"
          [class]="
            periodo() === opcion
              ? 'bg-[rgba(20,48,73,0.08)] text-brand-navy'
              : 'text-brand-muted hover:bg-[rgba(20,48,73,0.04)] hover:text-brand-text'
          "
          [attr.aria-checked]="periodo() === opcion"
          (click)="periodo.set(opcion)"
        >
          {{ p[opcion] }}
        </button>
      }
    </div>
  `,
})
export class PeriodoSelectorComponent {
  protected readonly t = inject<I18nService<AppDict>>(I18nService).t;
  protected readonly periodos = RESUMEN_PERIODOS;

  readonly periodo = model.required<ResumenPeriodo>();
}
