import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { rutaSinTenant } from '@reddoc/core';
import type { BreadcrumbItem } from './breadcrumb.types';

/**
 * Breadcrumb tonto y reusable.
 *
 * Recibe los `items` ya traducidos y los pinta separados por un caret; el último
 * se marca como página actual (no navegable). Opcionalmente muestra un `badge`
 * tipo pill al final (p. ej. el módulo activo). Siempre incluye un botón para
 * copiar la ruta de la página actual sin dominio, tenant ni query params
 * (`/venta/factura-venta/list`).
 *
 * No conoce i18n, router config ni dominio: el host arma los `items` (resuelve
 * labels y construye los `routerLink`). Mismo enfoque que `<lib-data-table>`.
 *
 * ```html
 * <lib-breadcrumb [items]="breadcrumbItems()" />
 * ```
 */
@Component({
  selector: 'lib-breadcrumb',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './breadcrumb.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  /** Trail de migajas; el último ítem es la página actual. */
  readonly items = input.required<readonly BreadcrumbItem[]>();
  /** Pill opcional al final del trail (p. ej. nombre del módulo). */
  readonly badge = input<string>('');
  /** Etiqueta accesible del botón de copiar (tooltip + aria-label). */
  readonly copyLabel = input<string>('Copiar ruta');

  /** `true` durante el breve lapso tras copiar, para alternar el icono a check. */
  protected readonly copied = signal(false);

  protected copyLink(): void {
    void navigator.clipboard?.writeText(rutaSinTenant(window.location.pathname));
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
