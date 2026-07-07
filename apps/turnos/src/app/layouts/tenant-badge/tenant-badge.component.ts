import { Component, computed, inject } from '@angular/core';
import { I18nService, TenantService } from '@reddoc/core';
import type { AppDict } from '@turnos/i18n';

/**
 * Identidad del contenedor activo en el header del `WorkspaceLayout`.
 *
 * Ancla de "¿en qué empresa estoy?": monograma (inicial) + nombre, arriba-izquierda
 * junto al logo. Etiqueta estática (cambiar de empresa vive en el user-menu).
 *
 * El nombre legible lo provee `TenantService.currentContenedor()`, que el
 * `tenantAccessGuard` repuebla antes de pintar el layout —incluso tras un reload
 * duro—, así que no requiere persistencia propia. Si por algún motivo no hubiera
 * contenedor, cae al slug para no quedar mudo.
 */
@Component({
  selector: 'app-tenant-badge',
  standalone: true,
  templateUrl: './tenant-badge.component.html',
  styleUrl: './tenant-badge.component.scss',
})
export class TenantBadgeComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly tenant = inject(TenantService);

  protected readonly t = this.i18n.t;

  /** Nombre legible del contenedor; cae al slug como respaldo defensivo. */
  protected readonly nombre = computed(
    () => this.tenant.currentContenedor()?.nombre ?? this.tenant.currentSlug() ?? '',
  );

  /** Inicial para el monograma; tolera nombres truncados manteniendo identidad. */
  protected readonly inicial = computed(() => this.nombre().charAt(0).toUpperCase());
}
