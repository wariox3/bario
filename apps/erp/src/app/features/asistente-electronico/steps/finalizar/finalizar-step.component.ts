import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ElectronicoService } from '../../electronico.service';
import type { AsistenteVariante, EstacionClave } from '../../asistente-variante';

/** Dónde está cada estación: la primera ya pasó, la segunda está pasando. */
type Estado = 'hecho' | 'enCurso' | 'pendiente';

interface Estacion {
  readonly clave: EstacionClave;
  readonly estado: Estado;
  /** Glifo del disco cuando todavía falta: dice qué viene. */
  readonly icono: string;
}

const ICONO_PENDIENTE: Readonly<Record<EstacionClave, string>> = {
  enviada: 'pi-check',
  revision: 'pi-clock',
  resoluciones: 'pi-file-edit',
  emitir: 'pi-send',
};

/**
 * Paso «Terminar»: el cierre del asistente.
 *
 * Dice que la parte de la persona terminó y qué pasa ahora, con el mismo riel
 * de discos del asistente extendido más allá de él: la DIAN revisa, avisa por
 * correo y sigue lo de cada módulo (resoluciones en venta, emitir en nómina).
 *
 * El asistente se cierra en el backend (`asistente-terminar/`) recién con el
 * botón, no al entrar: al paso se llega también desde el riel, y saltar acá
 * sin haber configurado nada no debe apagar la invitación del inicio del módulo.
 */
@Component({
  selector: 'app-finalizar-step',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './finalizar-step.component.html',
})
export class FinalizarStepComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly router = inject(Router);
  private readonly tenant = inject(TenantService);
  private readonly electronico = inject(ElectronicoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly finalizando = signal(false);

  readonly variante = input.required<AsistenteVariante>();

  /** Textos del cierre propios del módulo (título y bajada). */
  protected readonly textos = computed(
    () => this.t().asistenteElectronico.variantes[this.variante().id].finalizar,
  );

  /** El trámite visto desde acá: lo nuestro terminó, lo de la DIAN recién empieza. */
  protected readonly estaciones = computed<readonly Estacion[]>(() =>
    this.variante().estaciones.map((clave, i) => ({
      clave,
      estado: i === 0 ? 'hecho' : i === 1 ? 'enCurso' : 'pendiente',
      icono: `pi ${ICONO_PENDIENTE[clave]} text-[0.72rem]`,
    })),
  );

  /**
   * Cierra el asistente y vuelve al inicio del módulo, que es donde se emite
   * cuando la DIAN apruebe. Si falla, el interceptor ya avisó: se queda acá
   * para reintentar.
   */
  protected finalizar(): void {
    const slug = this.tenant.currentSlug();
    if (!slug || this.finalizando()) return;
    const { id, destino } = this.variante();
    this.finalizando.set(true);
    this.electronico
      .terminarAsistente(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigate(['/t', slug, ...destino]),
        error: () => this.finalizando.set(false),
      });
  }
}
