import { Component, DestroyRef, inject, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { finalize } from 'rxjs';
import { I18nService, ToastService, extractErrorMessage, type ErpSelectOption } from '@reddoc/core';
import { ErpApiSelectComponent, FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { MovimientoUtilidadService } from '../../movimiento.service';

/** Catálogo de comprobantes contables. */
const COMPROBANTE_ENDPOINT = '/contabilidad/comprobante/seleccionar/';

/**
 * Modal de **eliminar saldo inicial**: borra los movimientos de saldo inicial
 * de un comprobante y número (`eliminar-masivo/`).
 *
 * No se borran líneas sueltas: el backend elimina el asiento completo para no
 * descuadrar la contabilidad, y si algún movimiento cae en un periodo
 * bloqueado no elimina ninguno. El aviso del formulario lo dice antes de
 * confirmar.
 */
@Component({
  selector: 'app-eliminar-saldo-inicial-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    ErpApiSelectComponent,
    FieldErrorComponent,
    FocusInvalidDirective,
  ],
  templateUrl: './eliminar-saldo-inicial-modal.component.html',
  styles: ':host { display: contents; }',
})
export class EliminarSaldoInicialModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(MovimientoUtilidadService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = model<boolean>(false);

  /** Se emite tras borrar algo, para que el listado recargue. */
  readonly done = output<void>();

  protected readonly processing = signal(false);
  protected readonly comprobanteEndpoint = COMPROBANTE_ENDPOINT;

  protected readonly form = this.fb.group({
    comprobante: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    numero: this.fb.control<number | null>(null, Validators.required),
  });

  protected submit(): void {
    if (this.form.invalid || this.processing()) return;
    const { comprobante, numero } = this.form.getRawValue();
    if (!comprobante || numero === null) return;

    const m = this.t().entities.movimientoContable.eliminarSaldoInicial;
    this.processing.set(true);
    this.service
      .eliminarSaldoInicial({ comprobante_id: comprobante.id, numero })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.processing.set(false)),
      )
      .subscribe({
        next: ({ eliminados }) => {
          // Puede no haber nada con ese comprobante y número: decir «eliminado»
          // sobre cero movimientos haría creer que sí pasó.
          if (eliminados === 0) {
            this.toast.info(m.toasts.vacio.title, m.toasts.vacio.desc);
            return;
          }
          this.toast.success(
            m.toasts.success.title,
            m.toasts.success.desc.replace('{n}', String(eliminados)),
          );
          this.visible.set(false);
          this.done.emit();
        },
        error: (err: unknown) => {
          this.toast.error(m.toasts.error.title, extractErrorMessage(err, m.toasts.error.desc));
        },
      });
  }

  protected onHide(): void {
    this.form.reset();
  }
}
