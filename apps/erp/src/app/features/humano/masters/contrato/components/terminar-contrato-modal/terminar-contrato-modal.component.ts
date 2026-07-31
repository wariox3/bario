import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ErpApiSelectComponent, FieldErrorComponent } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  ToastService,
  fromIsoDate,
  toIsoDate,
  type ErpSelectOption,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ContratoService } from '../../contrato.service';

/** Datos con los que la ficha abre el modal. */
export interface TerminarContratoModalData {
  readonly contratoId: number;
  readonly empleado: string | null;
  /** Fin previsto del contrato: siembra la fecha de terminación. */
  readonly fechaHasta: string | null;
}

/** Catálogo de motivos. Ya lo usa el formulario del contrato. */
const MOTIVO_TERMINACION_ENDPOINT = '/humano/motivo-terminacion/seleccionar/';

/**
 * Termina un contrato: fecha y motivo.
 *
 * **No es un cambio de estado cualquiera.** Al terminar, el backend cierra el
 * contrato y **fabrica la liquidación** del empleado — cesantías, prima,
 * vacaciones e intereses. De ahí salen todas las liquidaciones del ERP: no se
 * crean desde su propia pantalla.
 *
 * Por eso el modal lo dice explícitamente antes de guardar, y por eso conviene
 * haber cargado los parámetros iniciales primero: son las fechas desde las que se
 * liquida cada prestación.
 */
@Component({
  selector: 'app-terminar-contrato-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    FieldErrorComponent,
    ErpApiSelectComponent,
  ],
  templateUrl: './terminar-contrato-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminarContratoModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ContratoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref = inject(DynamicDialogRef);
  private readonly config =
    inject<DynamicDialogConfig<TerminarContratoModalData>>(DynamicDialogConfig);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly motivoEndpoint = MOTIVO_TERMINACION_ENDPOINT;

  protected readonly datos = this.config.data as TerminarContratoModalData;

  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    // El fin previsto del contrato es el default natural; sigue siendo editable
    // porque la terminación real puede caer antes.
    fecha_terminacion: this.fb.control<Date | null>(
      fromIsoDate(this.datos.fechaHasta),
      Validators.required,
    ),
    motivo_terminacion: this.fb.control<ErpSelectOption | null>(null, Validators.required),
  });

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const toasts = this.t().entities.contrato.terminar.toasts;

    this.isSaving.set(true);
    this.service
      .terminar({
        id: this.datos.contratoId,
        fecha_terminacion: toIsoDate(raw.fecha_terminacion),
        motivo_terminacion: raw.motivo_terminacion?.id ?? null,
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
