import { Component, DestroyRef, effect, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { finalize } from 'rxjs';
import { FormErrorService, I18nService, ToastService, type ErpSelectOption } from '@reddoc/core';
import { ErpApiAutocompleteComponent, FieldErrorComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { ConceptoNominaService } from '../../../concepto-nomina/concepto-nomina.service';
import type { ConceptoNomina } from '../../../concepto-nomina/concepto-nomina.model';
import { CONCEPTO_ENDPOINT } from '../../../concepto-nomina/concepto-nomina.constants';
import {
  conceptoNominaFormToPayload,
  conceptoNominaToForm,
} from '../../../concepto-nomina/concepto-nomina.mapper';

/** Modal de edición de un concepto de nómina: qué concepto usa la nómina para ese rubro. */
@Component({
  selector: 'app-concepto-nomina-edit-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    ErpApiAutocompleteComponent,
    FieldErrorComponent,
  ],
  templateUrl: './concepto-nomina-edit-dialog.component.html',
  styles: ':host { display: contents; }',
})
export class ConceptoNominaEditDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ConceptoNominaService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly conceptoEndpoint = CONCEPTO_ENDPOINT;

  readonly visible = model<boolean>(false);
  readonly conceptoNomina = input<ConceptoNomina | null>(null);
  readonly saved = output<void>();

  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    concepto: this.fb.control<ErpSelectOption | null>(null, Validators.required),
  });

  constructor() {
    // Rehidrata el form cada vez que se abre con un rubro distinto.
    effect(() => {
      const conceptoNomina = this.conceptoNomina();
      if (!this.visible() || !conceptoNomina) return;
      this.form.reset(conceptoNominaToForm(conceptoNomina));
      this.form.markAsPristine();
    });
  }

  protected onSubmit(): void {
    const conceptoNomina = this.conceptoNomina();
    const concepto = this.form.controls.concepto.value;
    if (!conceptoNomina || this.isSaving()) return;
    if (this.form.invalid || !concepto) {
      this.form.markAllAsTouched();
      return;
    }

    const toasts = this.t().configuracion.humano.conceptoNomina.toasts;
    this.isSaving.set(true);

    this.service
      .update(conceptoNomina.id, conceptoNominaFormToPayload({ concepto }))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(toasts.saveSuccess.title, toasts.saveSuccess.desc);
          this.visible.set(false);
          this.saved.emit();
        },
        error: (err: unknown) => {
          this.formErrors.handle(this.form, err, toasts.saveError.title);
        },
      });
  }
}
