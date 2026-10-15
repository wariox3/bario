import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import {
  I18nService,
  MODELO,
  ModelPermissionsService,
  ToastService,
  formatCop,
  type ErpSelectOption,
} from '@reddoc/core';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import type { AppDict } from '@pos/i18n';
import { ConfiguracionCajaStore } from '../../../../configuracion/configuracion-caja.store';
import { ClienteRapidoDialogComponent } from '../../../cliente/components/cliente-rapido-dialog/cliente-rapido-dialog.component';
import { CobroDialogComponent } from '../../../cobro/components/cobro-dialog/cobro-dialog.component';
import { CarritosStore } from '../../carritos.store';
import type { LineaCarrito } from '../../carrito.model';
import { CarritoLineaComponent } from '../carrito-linea/carrito-linea.component';
import {
  EditarLineaDialogComponent,
  type CambiosLinea,
} from '../editar-linea-dialog/editar-linea-dialog.component';

/**
 * Panel de la venta activa: cliente, líneas, resumen y acciones (vaciar y cobrar).
 *
 * Cobrar no se apaga: si falta algo (configuración de la caja, cliente o
 * productos) avisa qué. Con un cobro pendiente la venta queda bloqueada y el
 * panel lo muestra; cobrar retoma ese cobro.
 */
@Component({
  selector: 'app-carrito-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    ClienteRapidoDialogComponent,
    CobroDialogComponent,
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

  private readonly configuracion = inject(ConfiguracionCajaStore);

  protected readonly t = this.i18n.t;
  protected readonly store = inject(CarritosStore);

  /** Se cobró una venta; la caja refresca el catálogo. */
  readonly cobrada = output<void>();

  protected readonly cobrando = signal(false);
  protected readonly creandoCliente = signal(false);
  private readonly permisos = inject(ModelPermissionsService);
  protected readonly puedeCrearCliente = computed(() =>
    this.permisos.allows(MODELO.general.contacto, 'crear'),
  );
  protected readonly bloqueada = computed(() => this.store.cobroPendiente() !== null);

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

  /**
   * Abre el cobro si la venta se puede cobrar; si no, dice qué falta. Público:
   * la caja lo dispara también con F2.
   */
  cobrar(): void {
    if (this.cobrando()) return;
    const tx = this.t().caja.cobro.requisitos;
    const venta = this.store.activo();
    if (!venta.cobro) {
      if (!this.configuracion.completa()) {
        this.toast.warn(tx.configuracion.title, tx.configuracion.desc);
        return;
      }
      if (venta.lineas.length === 0) {
        this.toast.warn(tx.productos.title, tx.productos.desc);
        return;
      }
      if (!venta.contacto) {
        this.toast.warn(tx.cliente.title, tx.cliente.desc);
        return;
      }
      // El backend no acepta un pago de $0: el documento quedaría creado y sin cobrar.
      if (this.store.resumen().total <= 0) {
        this.toast.warn(tx.sinValor.title, tx.sinValor.desc);
        return;
      }
    }
    this.cobrando.set(true);
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
