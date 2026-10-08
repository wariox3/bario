import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { AsistenteElectronicoModulo } from '@erp/core/services/parametro.service';
import { ASISTENTE_VARIANTES } from '../../asistente-variante';

/**
 * Puerta de vuelta al asistente electrónico desde Configuración (pestañas
 * Venta y Humano).
 *
 * No duplica sus pantallas: cada paso del asistente lee su estado del backend
 * (emisor, certificado, software), así que entrar de nuevo muestra lo que ya
 * está registrado y deja cambiarlo.
 */
@Component({
  selector: 'app-asistente-acceso',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './asistente-acceso.component.html',
})
export class AsistenteAccesoComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly router = inject(Router);
  private readonly tenant = inject(TenantService);

  protected readonly t = this.i18n.t;

  readonly variante = input.required<AsistenteElectronicoModulo>();

  protected readonly config = computed(() => ASISTENTE_VARIANTES[this.variante()]);
  protected readonly icono = computed(() => `pi ${this.config().icono} text-[1.05rem]`);

  protected abrir(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, this.config().ruta]);
  }
}
