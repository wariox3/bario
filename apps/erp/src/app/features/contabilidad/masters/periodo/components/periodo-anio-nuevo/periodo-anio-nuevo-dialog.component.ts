import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FieldErrorComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, ToastService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { PeriodoService } from '../../periodo.service';

const ANIO_MIN = 2000;
const ANIO_MAX = 2100;

/**
 * Diálogo para crear los periodos de un año nuevo. Un único campo (año); al enviar,
 * el backend genera los doce meses. Sigue el estándar de diálogos de la app
 * (`p-dialog` con header de ícono + título/subtítulo). Emite `created` con el año
 * para que el contenedor recargue y lo preseleccione.
 */
@Component({
  selector: 'app-periodo-anio-nuevo-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, FieldErrorComponent],
  templateUrl: './periodo-anio-nuevo-dialog.component.html',
})
export class PeriodoAnioNuevoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PeriodoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = input<boolean>(false);
  readonly visibleChange = output<boolean>();
  /** Año recién creado; el contenedor recarga y lo preselecciona. */
  readonly created = output<number>();

  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    anio: this.fb.control<number | null>(new Date().getFullYear(), [
      Validators.required,
      Validators.min(ANIO_MIN),
      Validators.max(ANIO_MAX),
    ]),
  });

  constructor() {
    // Al abrir, arranca limpio en el año actual (descarta intentos previos).
    effect(() => {
      if (this.visible()) {
        this.form.reset({ anio: new Date().getFullYear() });
        this.isSaving.set(false);
      }
    });
  }

  protected onVisibleChange(value: boolean): void {
    this.visibleChange.emit(value);
  }

  protected onCancel(): void {
    this.visibleChange.emit(false);
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const anio = this.form.getRawValue().anio as number;
    const toasts = this.t().entities.periodo.toasts;

    this.service
      .crearAnio(anio)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toast.success(toasts.crearSuccess.title, toasts.crearSuccess.desc);
          this.created.emit(anio);
          this.visibleChange.emit(false);
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.formErrors.handle(this.form, err, toasts.crearError.title);
        },
      });
  }
}
