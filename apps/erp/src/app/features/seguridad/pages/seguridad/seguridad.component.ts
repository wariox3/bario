import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { SEGURIDAD_MENU } from '../../seguridad.constants';
import type { SeguridadMenuItem } from '../../seguridad.types';

/**
 * Shell de Seguridad del contenedor.
 *
 * Aporta el chrome (card + título) y el **menú lateral** de secciones; el
 * contenido lo pinta la ruta hija en el `<router-outlet>`. No hace HTTP: cada
 * sección es auto-contenida y carga lo suyo, así que sumar secciones no lo
 * engorda.
 *
 * Los `routerLink` son relativos a esta ruta (`/t/:slug/seguridad`), por eso el
 * shell no necesita conocer el slug del tenant.
 */
@Component({
  selector: 'app-seguridad',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './seguridad.component.html',
  styleUrl: './seguridad.component.scss',
})
export class SeguridadComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly menu = SEGURIDAD_MENU;

  /**
   * Resuelve la clave i18n del item contra el diccionario activo.
   * Devuelve la clave misma si no existe — útil para detectar faltantes en dev.
   */
  protected translate(item: SeguridadMenuItem): string {
    let current: unknown = this.t();
    for (const part of item.labelKey.split('.')) {
      if (current === null || typeof current !== 'object') return item.labelKey;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' ? current : item.labelKey;
  }
}
