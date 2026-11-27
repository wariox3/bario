import { Component, effect, inject, input, model, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { I18nService } from '@reddoc/core';
import { FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';

/** Tope del backend: más de 31 días responde 400. */
export const CONCILIAR_DIAS_MAX = 31;

/**
 * Diálogo que pide la **tolerancia en días** antes de conciliar.
 *
 * Con 0 solo cruza fechas idénticas; con más, acepta que el banco registre el
 * movimiento unos días antes o después que los libros. Es tonto: emite los días
 * y quien lo abre corre el cruce, lo avisa y lo cierra.
 */
@Component({
  selector: 'app-conciliar-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    FieldErrorComponent,
    FocusInvalidDirective,
  ],
  templateUrl: './conciliar-dialog.component.html',
})
export class ConciliarDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly diasMax = CONCILIAR_DIAS_MAX;

  readonly visible = model(false);
  /** El cruce está corriendo: bloquea el diálogo hasta que termine. */
  readonly processing = input(false);
  readonly confirmar = output<number>();

  protected readonly form = this.fb.group({
    dias: this.fb.control<number | null>(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(CONCILIAR_DIAS_MAX),
    ]),
  });

  constructor() {
    // Cada apertura arranca en 0: la tolerancia se decide cada vez.
    effect(() => {
      if (this.visible()) this.form.reset({ dias: 0 });
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.processing()) return;
    this.confirmar.emit(this.form.controls.dias.value ?? 0);
  }
}
