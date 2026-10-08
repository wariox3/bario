import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Pestaña «Venta» de Configuración.
 *
 * Por ahora solo es la puerta de vuelta al asistente de facturación
 * electrónica. No duplica sus pantallas: cada paso del asistente lee su estado
 * del backend (emisor, certificado, software), así que entrar de nuevo muestra
 * lo que ya está registrado y deja cambiarlo.
 */
@Component({
  selector: 'app-venta-config',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './venta-config.component.html',
})
export class VentaConfigComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly router = inject(Router);
  private readonly tenant = inject(TenantService);

  protected readonly t = this.i18n.t;

  protected abrirAsistente(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, 'facturacion-electronica']);
  }
}
