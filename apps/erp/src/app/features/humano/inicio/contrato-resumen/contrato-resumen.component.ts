import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { I18nService, TenantService, formatFechaCorta, fromIsoDate } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ContratoResumenService } from './contrato-resumen.service';
import type { ContratoResumen } from './contrato-resumen.model';

type Estado = 'cargando' | 'listo' | 'error';

/**
 * Ficha de contratos del inicio de Humano, hermana de la de cartera: mismo
 * cuerpo (rótulo y fecha de corte, cifra principal, filas, enlace al pie).
 *
 * La cifra son los contratos activos —la planta de hoy—, con una barra que los
 * pone contra el total (lo que falta son los terminados). Abajo, el movimiento
 * del mes de corte: ingresos y retiros, cada uno con su flecha. Un retiro no es
 * un error, así que no se pinta en rojo.
 */
@Component({
  selector: 'app-contrato-resumen',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './contrato-resumen.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContratoResumenComponent {
  private readonly service = inject(ContratoResumenService);
  private readonly tenant = inject(TenantService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  protected readonly estado = signal<Estado>('cargando');
  protected readonly resumen = signal<ContratoResumen | null>(null);

  protected readonly fechaCorte = computed(() => formatFechaCorta(this.resumen()?.fecha, ''));

  /** Mes de la fecha de corte, en palabras: rotula el movimiento del mes. */
  protected readonly mes = computed(() => {
    const fecha = fromIsoDate(this.resumen()?.fecha);
    if (!fecha) return '';
    const locale = this.i18n.lang() === 'en' ? 'en-US' : 'es-CO';
    return new Intl.DateTimeFormat(locale, { month: 'long' }).format(fecha);
  });

  protected readonly sinContratos = computed(() => (this.resumen()?.contratos ?? 0) <= 0);

  /** Porción de la barra que ocupan los activos (0–100). */
  protected readonly porcentajeActivos = computed(() => {
    const r = this.resumen();
    if (!r || r.contratos <= 0) return 0;
    return Math.round((r.contratos_activos / r.contratos) * 100);
  });

  protected readonly contratosLink = computed<readonly string[]>(() => {
    const slug = this.tenant.currentSlug();
    return slug ? ['/t', slug, 'humano', 'contratos'] : [];
  });

  constructor() {
    this.service
      .obtener()
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe({
        next: (res) => {
          this.resumen.set(res);
          this.estado.set('listo');
        },
        error: () => this.estado.set('error'),
      });
  }
}
