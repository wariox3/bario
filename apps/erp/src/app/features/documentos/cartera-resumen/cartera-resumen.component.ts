import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService, TenantService, formatCop, formatFechaCorta } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { CarteraTipo } from '@erp/core/module-config';
import { CarteraResumenService } from './cartera-resumen.service';
import type { CarteraResumen } from './cartera-resumen.model';

/** Informe de pendientes de cada cartera: el destino del enlace de la ficha. */
const INFORME_POR_TIPO = {
  cobrar: ['cartera', 'informes', 'cuenta-cobrar'],
  pagar: ['tesoreria', 'informes', 'cuenta-pagar'],
} as const satisfies Record<CarteraTipo, readonly string[]>;

type Estado = 'cargando' | 'listo' | 'error';

/**
 * Ficha de saldo de una cartera, compacta: el pendiente total a la fecha de
 * corte y sus dos partes, vigente (punto verde) y vencido (punto rojo; el monto
 * se pinta en rojo solo si hay algo vencido), con el enlace al informe de
 * pendientes. Se piensa para ocupar una columna de una grilla de inicio.
 *
 * La comparten el inicio de Cartera (`cobrar`) y el de Tesorería (`pagar`).
 */
@Component({
  selector: 'app-cartera-resumen',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cartera-resumen.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteraResumenComponent {
  private readonly service = inject(CarteraResumenService);
  private readonly tenant = inject(TenantService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly tipo = input<CarteraTipo>('cobrar');

  protected readonly estado = signal<Estado>('cargando');
  protected readonly resumen = signal<CarteraResumen | null>(null);

  protected readonly formatMoney = formatCop;

  /** Textos que cambian según la cartera. */
  protected readonly textos = computed(() => this.t().inicio.carteraResumen.porTipo[this.tipo()]);

  protected readonly fechaCorte = computed(() => formatFechaCorta(this.resumen()?.fecha, ''));

  protected readonly hayVencido = computed(
    () => (this.resumen()?.total_pendiente_vencido ?? 0) > 0,
  );
  protected readonly sinPendiente = computed(() => (this.resumen()?.total_pendiente ?? 0) <= 0);

  protected readonly informeLink = computed<readonly string[]>(() => {
    const slug = this.tenant.currentSlug();
    return slug ? ['/t', slug, ...INFORME_POR_TIPO[this.tipo()]] : [];
  });

  constructor() {
    // Recarga si cambia la cartera; en la práctica cada inicio la fija una vez.
    effect((onCleanup) => {
      const tipo = this.tipo();
      this.estado.set('cargando');
      const sub = this.service.obtener(tipo).subscribe({
        next: (res) => {
          this.resumen.set(res);
          this.estado.set('listo');
        },
        error: () => this.estado.set('error'),
      });
      onCleanup(() => sub.unsubscribe());
    });
  }
}
