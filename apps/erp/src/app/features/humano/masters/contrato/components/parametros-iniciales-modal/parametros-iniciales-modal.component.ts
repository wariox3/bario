import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FormErrorService, I18nService, ToastService, fromIsoDate, toIsoDate } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ContratoService } from '../../contrato.service';

/** Datos con los que la ficha abre el modal: las cuatro fechas que ya tiene. */
export interface ParametrosInicialesModalData {
  readonly contratoId: number;
  readonly empleado: string | null;
  readonly fechaUltimoPago: string | null;
  readonly fechaUltimoPagoPrima: string | null;
  readonly fechaUltimoPagoCesantia: string | null;
  readonly fechaUltimoPagoVacacion: string | null;
}

/**
 * Las cuatro **fechas de último pago** del contrato: general, prima, cesantía y
 * vacación.
 *
 * Deciden desde cuándo se liquida cada prestación, así que se cargan **antes** de
 * terminar el contrato: corregirlas después obliga a reliquidar.
 *
 * Ninguna es obligatoria — un contrato nuevo no tiene pagos previos y el backend
 * acepta nulo.
 */
@Component({
  selector: 'app-parametros-iniciales-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, DatePickerModule],
  templateUrl: './parametros-iniciales-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametrosInicialesModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ContratoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref = inject(DynamicDialogRef);
  private readonly config =
    inject<DynamicDialogConfig<ParametrosInicialesModalData>>(DynamicDialogConfig);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly datos = this.config.data as ParametrosInicialesModalData;

  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    fecha_ultimo_pago: this.fb.control<Date | null>(fromIsoDate(this.datos.fechaUltimoPago)),
    fecha_ultimo_pago_prima: this.fb.control<Date | null>(
      fromIsoDate(this.datos.fechaUltimoPagoPrima),
    ),
    fecha_ultimo_pago_cesantia: this.fb.control<Date | null>(
      fromIsoDate(this.datos.fechaUltimoPagoCesantia),
    ),
    fecha_ultimo_pago_vacacion: this.fb.control<Date | null>(
      fromIsoDate(this.datos.fechaUltimoPagoVacacion),
    ),
  });

  protected onSubmit(): void {
    if (this.isSaving()) return;

    const raw = this.form.getRawValue();
    const toasts = this.t().entities.contrato.parametrosIniciales.toasts;

    this.isSaving.set(true);
    this.service
      .guardarParametrosIniciales(this.datos.contratoId, {
        // Un campo vacío es "sin pago previo", no "sin cambio": viaja como null.
        fecha_ultimo_pago: toIsoDate(raw.fecha_ultimo_pago),
        fecha_ultimo_pago_prima: toIsoDate(raw.fecha_ultimo_pago_prima),
        fecha_ultimo_pago_cesantia: toIsoDate(raw.fecha_ultimo_pago_cesantia),
        fecha_ultimo_pago_vacacion: toIsoDate(raw.fecha_ultimo_pago_vacacion),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toast.success(toasts.success.title, toasts.success.desc);
          this.ref.close(true);
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.formErrors.handle(this.form, err, toasts.error.title);
        },
      });
  }

  protected onCancel(): void {
    this.ref.close();
  }
}
