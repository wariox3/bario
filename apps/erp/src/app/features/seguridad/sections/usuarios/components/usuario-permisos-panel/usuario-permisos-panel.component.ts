import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService, type UsuarioPermiso } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Permisos del miembro (solo lectura): flags especiales (superusuario, staff)
 * y los permisos directos de `permiso.permisos`. Lo normal es que la lista
 * venga vacía — los permisos llegan por los grupos — y el empty state lo dice.
 */
@Component({
  selector: 'app-usuario-permisos-panel',
  standalone: true,
  templateUrl: './usuario-permisos-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioPermisosPanelComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Bloque `permiso` del miembro; `null` mientras no llega o si falló. */
  readonly permiso = input<UsuarioPermiso | null>(null);

  protected readonly permisos = computed(() => this.permiso()?.permisos ?? []);

  protected readonly tieneFlags = computed(() => {
    const p = this.permiso();
    return p != null && (p.is_superuser || p.is_staff);
  });
}
