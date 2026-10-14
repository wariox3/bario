import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService, formatCop, lineNeto } from '@reddoc/core';
import type { AppDict } from '@pos/i18n';
import type { LineaCarrito } from '../../carrito.model';

/**
 * Una línea de la venta: nombre, precio unitario, contador de cantidad y neto
 * (con impuestos). Tonta: emite la intención y el panel decide.
 */
@Component({
  selector: 'app-carrito-linea',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './carrito-linea.component.html',
})
export class CarritoLineaComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly linea = input.required<LineaCarrito>();
  /** La venta tiene un cobro pendiente: la línea se ve pero no se toca. */
  readonly bloqueada = input(false);

  readonly cantidad = output<number>();
  readonly editar = output<LineaCarrito>();
  readonly retirar = output<number>();

  protected readonly precio = computed(() => formatCop(this.linea().precio));
  protected readonly neto = computed(() => formatCop(lineNeto(this.linea())));
  /** Ya lleva todo el stock: el `+` se apaga. */
  protected readonly enTope = computed(() => {
    const l = this.linea();
    return l.disponible !== null && l.cantidad >= l.disponible;
  });
}
