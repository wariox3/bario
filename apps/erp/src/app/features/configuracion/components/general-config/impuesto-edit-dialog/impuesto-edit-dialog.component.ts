import { Component, DestroyRef, effect, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { finalize } from 'rxjs';
import { FormErrorService, I18nService, ToastService, type ErpSelectOption } from '@reddoc/core';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import type { AppDict } from '@erp/i18n';
import { ImpuestoService } from '../../../impuesto/impuesto.service';
import type { Impuesto } from '../../../impuesto/impuesto.model';
import { impuestoFormToPayload, impuestoToForm } from '../../../impuesto/impuesto.mapper';

/**
 * Modal de edición de un impuesto: solo la cuenta contable, que es lo único que
 * el backend deja configurar por tenant. Se puede vaciar para quitarla.
 */
@Component({
  selector: 'app-impuesto-edit-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, ErpCuentaSelectComponent],
  templateUrl: './impuesto-edit-dialog.component.html',
  styles: ':host { display: contents; }',
})
export class ImpuestoEditDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ImpuestoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = model<boolean>(false);
  readonly impuesto = input<Impuesto | null>(null);
  readonly saved = output<void>();

  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    cuenta: this.fb.control<ErpSelectOption | null>(null),
  });

  constructor() {
    // Rehidrata el form cada vez que se abre con un impuesto distinto.
    effect(() => {
      const impuesto = this.impuesto();
      if (!this.visible() || !impuesto) return;
      this.form.reset(impuestoToForm(impuesto));
      this.form.markAsPristine();
    });
  }

  protected onSubmit(): void {
    const impuesto = this.impuesto();
    if (!impuesto || this.isSaving()) return;

    const toasts = this.t().configuracion.general.impuesto.toasts;
    this.isSaving.set(true);

    this.service
      .update(impuesto.id, impuestoFormToPayload(this.form.getRawValue()))
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
