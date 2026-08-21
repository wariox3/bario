import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService } from '@reddoc/core';
import { ParametroService } from '@erp/core/services/parametro.service';
import type { AppDict } from '@erp/i18n';

/**
 * Inicio del módulo Venta.
 *
 * Hoy solo hospeda la invitación a facturar electrónicamente. Es el landing del
 * módulo, así que va a crecer (indicadores, accesos rápidos): la invitación se
 * compone como una tira arriba, no como el contenido de la página, para que lo
 * que venga después se apile debajo sin rehacerla.
 */
@Component({
  selector: 'app-venta-inicio',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './venta-inicio.component.html',
  // Mismo ancho acotado que Configuración: no es una tabla, se lee mejor en una
  // columna. Las listas del ERP sí van a todo el ancho.
  host: { class: 'mx-auto flex w-full max-w-[1200px] flex-col' },
})
export class VentaInicioComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly parametro = inject(ParametroService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);

  protected readonly t = this.i18n.t;

  /**
   * `null` = todavía no sabemos (petición en vuelo o fallida).
   *
   * Los tres estados importan: solo con un `false` **confirmado** invitamos.
   * Si arrancara en `false` la tira parpadearía en toda entrada al módulo,
   * incluso en contenedores que ya facturan electrónicamente.
   */
  private readonly facturaElectronicaActiva = signal<boolean | null>(null);

  /** La invitación aparece solo si el contenedor confirmó que NO está activa. */
  protected readonly mostrarInvitacion = computed(() => this.facturaElectronicaActiva() === false);

  constructor() {
    this.parametro
      .facturaElectronicaActiva()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (activa) => this.facturaElectronicaActiva.set(activa),
        // Sin dato no hay invitación: preferimos no ofrecer nada antes que
        // ofrecerle activar a quien quizá ya activó.
        error: () => this.facturaElectronicaActiva.set(null),
      });
  }

  /**
   * Al asistente de facturación electrónica, que vive fuera del módulo: lo que
   * completa son datos de la **empresa**, no de Venta.
   */
  protected onCompletar(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, 'facturacion-electronica']);
  }
}
