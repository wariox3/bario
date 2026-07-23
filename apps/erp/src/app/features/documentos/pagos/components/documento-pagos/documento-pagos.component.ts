import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { I18nService, formatCop } from '@reddoc/core';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { createPagoGroup, type PagoFormRawValue, type PagoGroup } from '../../pago.form';
import { CUENTA_BANCO_ENDPOINT } from '../../pago.constants';

/**
 * Sección de **pagos** de un documento que se cobra en el acto (factura POS, nota
 * crédito de venta…). Building block transversal: recibe el `FormArray` de pagos
 * del form padre y el total del documento, y lo edita **inline** (fila de cuenta
 * de banco + monto), mostrando el resumen recibido/pendiente.
 *
 * Es agnóstico al documento: el padre posee el `FormArray` (viaja en su payload)
 * y le pasa el total contra el que validar. La regla de negocio —lo recibido no
 * puede superar el total— se expone vía `excede()` para que el padre bloquee el
 * guardado (mismo patrón que `pendingCount()` en la tabla de detalles).
 */
@Component({
  selector: 'app-documento-pagos',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputNumberModule, ErpApiSelectComponent],
  templateUrl: './documento-pagos.component.html',
  styleUrl: './documento-pagos.component.scss',
})
export class DocumentoPagosComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
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

  /** Espejo reactivo del valor del array para los totales y el resumen. */
  private readonly mirror = signal<readonly PagoFormRawValue[]>([]);

  /** Total recibido en pagos. */
  readonly totalPagos = computed(() => this.mirror().reduce((acc, p) => acc + (p.pago ?? 0), 0));

  /** Saldo pendiente por cubrir con pagos (nunca negativo para mostrar). */
  protected readonly saldoPendiente = computed(() =>
    Math.max(this.documentTotal() - this.totalPagos(), 0),
  );

  /** `true` cuando lo recibido supera el total del documento (bloquea el guardado). */
  readonly excede = computed(() => this.totalPagos() > this.documentTotal());

  constructor() {
    // Espejo reactivo del FormArray inyectado (se re-suscribe si cambia la instancia).
    effect((onCleanup) => {
      const array = this.pagos();
      this.mirror.set(array.getRawValue());
      const sub = array.valueChanges.subscribe(() => this.mirror.set(array.getRawValue()));
      onCleanup(() => sub.unsubscribe());
    });
  }

  /** Agrega una fila de pago vacía. */
  protected addPago(): void {
    this.pagos().push(createPagoGroup());
  }

  /** Quita la fila de pago en `index`. */
  protected removePago(index: number): void {
    this.pagos().removeAt(index);
  }
}
