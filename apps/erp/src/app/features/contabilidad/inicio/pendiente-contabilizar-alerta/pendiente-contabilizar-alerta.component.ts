import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { I18nService, TenantService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { periodoIdDe, PendienteContabilizarService } from './pendiente-contabilizar.service';

/**
 * Aviso del inicio de Contabilidad: documentos del mes en curso que siguen sin
 * contabilizar, con el enlace a la utilidad que los contabiliza.
 *
 * Solo aparece si hay pendientes. Si la consulta falla tampoco se muestra: es
 * un aviso, no la cifra del tablero, y un error encima de la card la taparía.
 *
 * El host es `display: contents` para que el aviso caiga directo en la grilla
 * del inicio y ocupe todo su ancho.
 */
@Component({
  selector: 'app-pendiente-contabilizar-alerta',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (cantidad() > 0) {
      @let tx = t().inicio.pendienteContabilizar;
      <div
        role="status"
        class="animate-fade-up flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[0.8rem] text-amber-800 sm:col-span-2 lg:col-span-4"
      >
        <i class="pi pi-exclamation-triangle text-[0.85rem] text-amber-600" aria-hidden="true"></i>
        <span>{{ mensaje() }}</span>
        <a
          [routerLink]="contabilizarLink()"
          class="inline-flex items-center gap-1 font-semibold text-amber-900 underline-offset-2 hover:underline"
        >
          {{ tx.verDetalle }}
          <i class="pi pi-arrow-right text-[0.62rem]" aria-hidden="true"></i>
        </a>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PendienteContabilizarAlertaComponent {
  private readonly service = inject(PendienteContabilizarService);
  private readonly tenant = inject(TenantService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  protected readonly cantidad = signal(0);

  protected readonly mensaje = computed(() => {
    const tx = this.t().inicio.pendienteContabilizar;
    const n = this.cantidad();
    return (n === 1 ? tx.uno : tx.varios).replace('{n}', String(n));
  });

  protected readonly contabilizarLink = computed<readonly string[]>(() => {
    const slug = this.tenant.currentSlug();
    return slug ? ['/t', slug, 'contabilidad', 'utilidades', 'contabilizar'] : [];
  });

  constructor() {
    this.service
      .obtener(periodoIdDe(new Date()))
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe({
        next: (res) => this.cantidad.set(res.cantidad),
        error: () => this.cantidad.set(0),
      });
  }
}
