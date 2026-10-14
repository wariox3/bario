import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { I18nService, ToastService, formatCop, type ErpSelectOption } from '@reddoc/core';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import type { AppDict } from '@pos/i18n';
import { CarritosStore } from '../../carritos.store';
import type { LineaCarrito } from '../../carrito.model';
import { CarritoLineaComponent } from '../carrito-linea/carrito-linea.component';
import {
  EditarLineaDialogComponent,
  type CambiosLinea,
} from '../editar-linea-dialog/editar-linea-dialog.component';

/**
 * Panel de la venta activa: cliente, líneas, resumen y acciones.
 *
 * El botón Cobrar queda visible pero apagado hasta el sprint 3, que trae el
 * modal de cobro.
 */
@Component({
  selector: 'app-carrito-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    TooltipModule,
    ErpContactoSelectComponent,
    CarritoLineaComponent,
    EditarLineaDialogComponent,
  ],
  templateUrl: './carrito-panel.component.html',
})
export class CarritoPanelComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly store = inject(CarritosStore);

  protected readonly contactoParams = { cliente: 'True' } as const;

  /** Línea abierta en el diálogo de edición. */
  protected readonly editando = signal<LineaCarrito | null>(null);

  protected readonly subtotal = computed(() => formatCop(this.store.resumen().subtotal));
  protected readonly total = computed(() => formatCop(this.store.resumen().total));
  protected readonly impuestos = computed(() =>
    this.store.resumen().impuestos.map((i) => ({ ...i, monto: formatCop(i.total) })),
  );

  protected onContacto(contacto: ErpSelectOption | null): void {
    this.store.cambiarContacto(contacto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected onCantidad(itemId: number, cantidad: number): void {
    if (this.store.fijarCantidad(itemId, cantidad) === 'sinStock') this.avisarSinStock();
  }

  protected onGuardarEdicion(cambios: CambiosLinea): void {
    const linea = this.editando();
    if (!linea) return;
    this.store.editarLinea(linea.item.id, cambios);
    this.editando.set(null);
  }

  protected onVaciar(): void {
    const tx = this.t().caja.carrito.vaciar;
    const uuid = this.store.activo().uuid;
    this.confirmation.confirm({
      header: tx.header,
      message: tx.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: tx.aceptar,
      rejectLabel: this.t().caja.carrito.cancelar,
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.store.vaciar(uuid),
    });
  }

  private avisarSinStock(): void {
    const tx = this.t().caja.toasts.sinStock;
    this.toast.warn(tx.title, tx.desc);
  }
}
