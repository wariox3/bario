import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { InicioInvitacionComponent } from '@erp/core/components/inicio-invitacion/inicio-invitacion.component';
import { I18nService, TenantService } from '@reddoc/core';
import { ParametroService } from '@erp/core/services/parametro.service';
import { FacturaElectronicaService } from '@erp/features/facturacion-electronica/factura-electronica.service';
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
  imports: [ButtonModule, InicioInvitacionComponent],
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
  private readonly facturaElectronica = inject(FacturaElectronicaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;

  /**
   * `null` = todavía no sabemos (petición en vuelo o fallida).
   *
   * Los tres estados importan: solo con un `true` **confirmado** invitamos. Si
   * arrancara en `true` la tira parpadearía en toda entrada al módulo, incluso
   * en contenedores que ya terminaron u omitieron el asistente.
   */
  private readonly asistentePendiente = signal<boolean | null>(null);

  /** La invitación aparece solo si el backend confirmó que el asistente sigue pendiente. */
  protected readonly mostrarInvitacion = computed(() => this.asistentePendiente() === true);

  /** «Omitir» en vuelo: carga en su botón y bloquea «Completar». */
  protected readonly omitiendo = signal(false);

  constructor() {
    this.parametro
      .asistenteElectronico('venta')
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (pendiente) => this.asistentePendiente.set(pendiente),
        // Sin dato no hay invitación: preferimos no ofrecer nada antes que
        // insistirle a quien quizá ya lo terminó.
        error: () => this.asistentePendiente.set(null),
      });
  }

  /**
   * La empresa no quiere el asistente: se cierra igual que al terminarlo y la
   * tira se va. Si falla, el interceptor ya avisó; solo se libera el botón.
   */
  protected onOmitir(): void {
    if (this.omitiendo()) return;
    this.omitiendo.set(true);
    this.facturaElectronica
      .terminarAsistente('venta')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.omitiendo.set(false);
          this.asistentePendiente.set(false);
        },
        error: () => this.omitiendo.set(false),
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
