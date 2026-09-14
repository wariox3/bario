import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { I18nService, ToastService, formatCop } from '@reddoc/core';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { createPagoGroup, type PagoFormRawValue, type PagoGroup } from '../../pago.form';
import { CUENTA_BANCO_ENDPOINT } from '../../pago.constants';
import { calcularPagos } from '../../pago.calculo';

/**
 * Sección de **pagos** de un documento que se cobra en el acto (factura POS, nota
 * crédito de venta…). Building block transversal: recibe el `FormArray` de pagos
 * del form padre y el total del documento, y lo edita en una **tabla** (cuenta de
 * banco + monto) con el mismo idioma que la tabla de detalles, más el resumen
 * recibido/pendiente.
 *
 * Es agnóstico al documento: el padre posee el `FormArray` (viaja en su payload)
 * y le pasa el total contra el que validar. La regla de negocio —lo recibido no
 * puede superar el total— se expone vía `excede()` para que el padre bloquee el
 * guardado (mismo patrón que `pendingCount()` en la tabla de detalles).
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
  protected readonly formatMoney = formatCop;
  protected readonly cuentaBancoEndpoint = CUENTA_BANCO_ENDPOINT;

  /** FormArray de pagos, propiedad del form padre (viaja en su payload). */
  readonly pagos = input.required<FormArray<PagoGroup>>();

  /** Total del documento contra el que se valida y se calcula el saldo. */
  readonly documentTotal = input.required<number>();

  /**
   * Texto de ayuda bajo el toolbar. Opcional: cada documento puede matizarlo
   * (POS: "cobros en el punto de venta"); por defecto, genérico.
   */
  readonly hint = input<string | null>(null);

  /**
   * Pinta el resumen propio (total, recibido, saldo) bajo la tabla. Default `true`;
   * lo apaga el formulario que muestra un único resumen fuera de los tabs.
   */
  readonly resumenEnabled = input<boolean>(true);

  /** Espejo reactivo del valor del array para los totales y el resumen. */
  private readonly mirror = signal<readonly PagoFormRawValue[]>([]);

  /** Recibido, saldo y exceso: la misma función que usa el formulario padre. */
  private readonly calculo = computed(() => calcularPagos(this.mirror(), this.documentTotal()));

  /** Total recibido en pagos. */
  readonly totalPagos = computed(() => this.calculo().recibido);

  /** Saldo pendiente por cubrir con pagos (nunca negativo). */
  protected readonly saldoPendiente = computed(() => this.calculo().saldo);

  /** `true` cuando lo recibido supera el total del documento (bloquea el guardado). */
  readonly excede = computed(() => this.calculo().excede);

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
