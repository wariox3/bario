import { Component, DestroyRef, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { finalize } from 'rxjs';
import { I18nService, ToastService, extractErrorMessage, type ErpSelectOption } from '@reddoc/core';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import type { AppDict } from '@erp/i18n';
import { CuentaService } from '../../cuenta.service';

/**
 * Modal de **trasladar movimientos a esta cuenta**.
 *
 * La cuenta abierta en la ficha es siempre el **destino**; lo único que se elige
 * es la cuenta **origen**, cuyos movimientos pasan a la primera. Es irreversible,
 * así que el envío pasa por una confirmación explícita —igual que en el ERP
 * anterior— además del aviso dentro del formulario.
 *
 * A diferencia del original, no deja elegir la cuenta abierta como origen: un
 * traslado de una cuenta a sí misma no significa nada y allá llegaba al backend.
 */
@Component({
  selector: 'app-trasladar-movimientos-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ConfirmDialogModule,
    ButtonModule,
    ErpCuentaSelectComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './trasladar-movimientos-modal.component.html',
})
export class TrasladarMovimientosModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CuentaService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = model<boolean>(false);

  /** Cuenta destino: la de la ficha que hospeda el modal. */
  readonly cuentaDestinoId = input.required<number>();
  readonly cuentaDestinoCodigo = input<string>('');

  /** Se emite al terminar, para que la ficha recargue la cuenta. */
  readonly done = output<void>();

  protected readonly processing = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    cuenta_origen: [
      null as ErpSelectOption | null,
      [Validators.required, distintaDe(() => this.cuentaDestinoId())],
    ],
  });

  protected readonly origenControl = this.form.controls.cuenta_origen;

  protected submit(): void {
    if (this.form.invalid || this.processing()) {
      this.form.markAllAsTouched();
      return;
    }

    const origen = this.form.getRawValue().cuenta_origen;
    if (!origen) return;

    const m = this.t().entities.cuenta.detail.traslado;
    this.confirmation.confirm({
      header: m.confirm.header,
      message: m.confirm.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: m.confirm.accept,
      rejectLabel: this.t().common.actions.cancel,
      rejectButtonProps: { severity: 'secondary', outlined: true },
      acceptButtonProps: { severity: 'danger' },
      accept: () => this.trasladar(origen.id),
    });
  }

  private trasladar(cuentaOrigenId: number): void {
    const m = this.t().entities.cuenta.detail.traslado;
    this.processing.set(true);
    this.service
      .trasladar({
        cuenta_origen_id: cuentaOrigenId,
        cuenta_destino_id: this.cuentaDestinoId(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.processing.set(false)),
      )
      .subscribe({
        // El backend describe en `mensaje` cuántos movimientos movió: vale más
        // que un texto fijo, así que se muestra cuando viene.
        next: (respuesta) => {
          this.toast.success(m.toasts.success.title, respuesta.mensaje || m.toasts.success.desc);
          this.form.reset();
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

/**
 * La cuenta elegida no puede ser la misma que recibe los movimientos. El id
 * destino llega por función porque el validador se construye antes de que el
 * input esté resuelto.
 */
function distintaDe(destinoId: () => number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as ErpSelectOption | null;
    if (!value) return null;
    return value.id === destinoId() ? { mismaCuenta: true } : null;
  };
}
