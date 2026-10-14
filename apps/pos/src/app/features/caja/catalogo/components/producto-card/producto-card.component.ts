import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService, formatCop } from '@reddoc/core';
import type { AppDict } from '@pos/i18n';
import { estaAgotado, type ProductoCatalogo } from '../../producto-catalogo.model';

/**
 * Tarjeta de un producto en el catálogo de la caja: imagen, código, nombre,
 * precio, stock, estrella de favorito y las unidades que ya lleva la venta.
 *
 * Es tonta: no sabe de carrito ni de HTTP. Emite la intención (agregar, marcar
 * favorito) y la página decide. Toda la tarjeta es el botón de agregar; la
 * estrella es un botón aparte, encima, para no anidar botones.
 */
@Component({
  selector: 'app-producto-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './producto-card.component.html',
})
export class ProductoCardComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly producto = input.required<ProductoCatalogo>();
  /** Unidades de este producto en la venta activa. */
  readonly cantidad = input(0);

  readonly agregar = output<ProductoCatalogo>();
  readonly alternarFavorito = output<number>();

  protected readonly agotado = computed(() => estaAgotado(this.producto()));
  protected readonly precio = computed(() => formatCop(this.producto().precio));

  protected onFavorito(): void {
    this.alternarFavorito.emit(this.producto().id);
  }
}
