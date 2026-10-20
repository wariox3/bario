import { Component, DestroyRef, effect, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { finalize } from 'rxjs';
import { FormErrorService, I18nService, ToastService, type ErpSelectOption } from '@reddoc/core';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import type { AppDict } from '@erp/i18n';
import { ConfiguracionAporteService } from '../../../configuracion-aporte/configuracion-aporte.service';
import type { ConfiguracionAporteRow } from '../../../configuracion-aporte/configuracion-aporte.model';
import {
  configuracionAporteFormToPayload,
  configuracionAporteToForm,
} from '../../../configuracion-aporte/configuracion-aporte.mapper';

/** Modal de edición de un aporte: solo su cuenta contable. Se puede vaciar para quitarla. */
@Component({
  selector: 'app-aporte-edit-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, ErpCuentaSelectComponent],
  templateUrl: './aporte-edit-dialog.component.html',
  styles: ':host { display: contents; }',
})
export class AporteEditDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ConfiguracionAporteService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = model<boolean>(false);
  readonly aporte = input<ConfiguracionAporteRow | null>(null);
  readonly saved = output<void>();

  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    cuenta: this.fb.control<ErpSelectOption | null>(null),
  });

  constructor() {
    // Rehidrata el form cada vez que se abre con un aporte distinto.
    effect(() => {
      const aporte = this.aporte();
      if (!this.visible() || !aporte) return;
      this.form.reset(configuracionAporteToForm(aporte));
      this.form.markAsPristine();
    });
  }

  protected onSubmit(): void {
    const aporte = this.aporte();
    if (!aporte || this.isSaving()) return;

    const toasts = this.t().configuracion.humano.aporte.toasts;
    this.isSaving.set(true);

    this.service
      .update(aporte.id, configuracionAporteFormToPayload(this.form.getRawValue()))
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
