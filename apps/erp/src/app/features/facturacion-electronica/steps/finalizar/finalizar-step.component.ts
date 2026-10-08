import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { FacturaElectronicaService } from '../../factura-electronica.service';

/** Estación del «qué sigue»: dónde está cada cosa después del asistente. */
type Estado = 'hecho' | 'enCurso' | 'pendiente';

interface Estacion {
  readonly clave: 'enviada' | 'revision' | 'resoluciones';
  readonly estado: Estado;
}

/** El trámite visto desde acá: lo nuestro terminó, lo de la DIAN recién empieza y después vienen las resoluciones. */
const ESTACIONES: readonly Estacion[] = [
  { clave: 'enviada', estado: 'hecho' },
  { clave: 'revision', estado: 'enCurso' },
  { clave: 'resoluciones', estado: 'pendiente' },
];

/**
 * Paso «Terminar»: el cierre del asistente.
 *
 * Dice que la parte de la persona terminó y qué pasa ahora, con el mismo riel
 * de discos del asistente extendido más allá de él: la DIAN revisa, avisa por
 * correo y siguen las resoluciones.
 *
 * El asistente se cierra en el backend (`asistente-terminar/`) recién con el
 * botón, no al entrar: al paso se llega también desde el riel, y saltar acá
 * sin haber configurado nada no debe apagar la invitación del inicio de Venta.
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
  private readonly facturaElectronica = inject(FacturaElectronicaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly estaciones = ESTACIONES;
  protected readonly finalizando = signal(false);

  /**
   * Cierra el asistente y lleva a Venta, que es donde se factura cuando la DIAN
   * apruebe. Si falla, el interceptor ya avisó: se queda acá para reintentar.
   */
  protected finalizar(): void {
    const slug = this.tenant.currentSlug();
    if (!slug || this.finalizando()) return;
    this.finalizando.set(true);
    this.facturaElectronica
      .terminarAsistente('venta')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigate(['/t', slug, 'venta', 'inicio']),
        error: () => this.finalizando.set(false),
      });
  }
}
