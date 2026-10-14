import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, type MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { type Menu, MenuModule } from 'primeng/menu';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@pos/i18n';
import { CarritosStore } from '../../carritos.store';
import type { Carrito } from '../../carrito.model';

/**
 * Pestañas de las ventas abiertas: cambiar de venta, abrir una nueva, y por
 * pestaña renombrar o cerrar (cerrar una venta con productos pide confirmación).
 */
@Component({
  selector: 'app-carrito-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, DialogModule, InputTextModule, MenuModule],
  templateUrl: './carrito-tabs.component.html',
})
export class CarritoTabsComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly t = this.i18n.t;
  protected readonly store = inject(CarritosStore);

  private readonly menu = viewChild.required<Menu>('menu');

  protected readonly opciones = signal<MenuItem[]>([]);

  /** Venta que se está renombrando y el nombre en edición. */
  protected readonly renombrando = signal<Carrito | null>(null);
  protected nombre = '';

  protected abrirOpciones(event: Event, carrito: Carrito): void {
    const tx = this.t().caja.tabs;
    this.opciones.set([
      { label: tx.renombrar, icon: 'pi pi-pencil', command: () => this.iniciarRenombre(carrito) },
      { label: tx.cerrar, icon: 'pi pi-times', command: () => this.cerrar(carrito) },
    ]);
    this.menu().toggle(event);
  }

  protected guardarNombre(): void {
    const carrito = this.renombrando();
    if (carrito) this.store.renombrar(carrito.uuid, this.nombre);
    this.renombrando.set(null);
  }

  private iniciarRenombre(carrito: Carrito): void {
    this.nombre = carrito.nombre;
    this.renombrando.set(carrito);
  }

  private cerrar(carrito: Carrito): void {
    if (carrito.lineas.length === 0) {
      this.store.eliminar(carrito.uuid);
      return;
    }
    const tx = this.t().caja.tabs.confirmarCierre;
    this.confirmation.confirm({
      header: tx.header,
      message: tx.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: tx.aceptar,
      rejectLabel: this.t().caja.carrito.cancelar,
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.store.eliminar(carrito.uuid),
    });
  }
}
