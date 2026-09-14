import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { I18nService, ToastService } from '@reddoc/core';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { createPagoGroup, type PagoFormRawValue, type PagoGroup } from '../../pago.form';
import { CUENTA_BANCO_ENDPOINT } from '../../pago.constants';
import { calcularPagos } from '../../pago.calculo';

/**
 * Sección de **pagos** de un documento que se cobra en el acto (factura POS, nota
 * crédito de venta…). Building block transversal: recibe el `FormArray` de pagos
 * del form padre y el total del documento, y lo edita en una **tabla** (cuenta de
 * banco + monto) con el mismo idioma que la tabla de detalles.
 *
 * Es agnóstico al documento: el padre posee el `FormArray` (viaja en su payload)
 * y le pasa el total, que aquí solo sirve para prellenar cada fila con el saldo.
 * El resumen (recibido, saldo) y la regla —lo recibido no puede superar el total—
 * los resuelve el documento con `calcularPagos`, fuera de los tabs.
 */
@Component({
  selector: 'app-documento-pagos',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    TooltipModule,
    ErpApiSelectComponent,
  ],
  templateUrl: './documento-pagos.component.html',
  styleUrl: './documento-pagos.component.scss',
})
export class DocumentoPagosComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly cuentaBancoEndpoint = CUENTA_BANCO_ENDPOINT;

  /** FormArray de pagos, propiedad del form padre (viaja en su payload). */
  readonly pagos = input.required<FormArray<PagoGroup>>();

  /** Total del documento; de él sale el saldo con que se prellena cada fila nueva. */
  readonly documentTotal = input.required<number>();

  /**
   * Texto de ayuda bajo el toolbar. Opcional: cada documento puede matizarlo
   * (POS: "cobros en el punto de venta"); por defecto, genérico.
   */
  readonly hint = input<string | null>(null);

  /** Espejo reactivo del valor del array para calcular el saldo. */
  private readonly mirror = signal<readonly PagoFormRawValue[]>([]);

  /** Saldo por la misma función con que el documento arma su resumen. */
  private readonly calculo = computed(() => calcularPagos(this.mirror(), this.documentTotal()));

  /** Saldo pendiente por cubrir con pagos (nunca negativo). */
  protected readonly saldoPendiente = computed(() => this.calculo().saldo);

  constructor() {
    // Espejo reactivo del FormArray inyectado (se re-suscribe si cambia la instancia).
    effect((onCleanup) => {
      const array = this.pagos();
      this.mirror.set(array.getRawValue());
      const sub = array.valueChanges.subscribe(() => this.mirror.set(array.getRawValue()));
      onCleanup(() => sub.unsubscribe());
    });
  }

  /**
   * Agrega una fila de pago con el saldo pendiente como monto: el caso común es
   * cobrar lo que falta, así que un solo clic cuadra el documento. Sin valor por
   * cobrar (no hay detalles) no hay pago que registrar: se avisa en vez de crear
   * una fila en cero.
   */
  protected addPago(): void {
    if (this.documentTotal() <= 0) {
      const toast = this.t().entities.documentoPago.toasts.sinDetalles;
      this.toast.warn(toast.title, toast.desc);
      return;
    }
    this.pagos().push(createPagoGroup({ pago: this.saldoPendiente() }));
  }

  /** Quita la fila de pago en `index`. */
  protected removePago(index: number): void {
    this.pagos().removeAt(index);
  }
}
