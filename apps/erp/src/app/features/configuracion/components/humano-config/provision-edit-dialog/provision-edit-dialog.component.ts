import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { finalize } from 'rxjs';
import { FormErrorService, I18nService, ToastService, type ErpSelectOption } from '@reddoc/core';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import type { AppDict } from '@erp/i18n';
import { ConfiguracionProvisionService } from '../../../configuracion-provision/configuracion-provision.service';
import type { ConfiguracionProvisionRow } from '../../../configuracion-provision/configuracion-provision.model';
import {
  configuracionProvisionFormToPayload,
  configuracionProvisionToForm,
  provisionLlevaCredito,
} from '../../../configuracion-provision/configuracion-provision.mapper';

/**
 * Modal de edición de una provisión: cuenta débito y, si la lleva, crédito.
 * Las de seguridad social y parafiscales solo tienen débito (su contrapartida
 * es la cuenta del aporte). Cualquiera se puede vaciar para quitarla.
 */
@Component({
  selector: 'app-provision-edit-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, ErpCuentaSelectComponent],
  templateUrl: './provision-edit-dialog.component.html',
  styles: ':host { display: contents; }',
})
export class ProvisionEditDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ConfiguracionProvisionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = model<boolean>(false);
  readonly provision = input<ConfiguracionProvisionRow | null>(null);
  readonly saved = output<void>();

  protected readonly isSaving = signal(false);
  protected readonly llevaCredito = computed(() => {
    const provision = this.provision();
    return provision != null && provisionLlevaCredito(provision);
  });

  protected readonly form = this.fb.group({
    cuenta_debito: this.fb.control<ErpSelectOption | null>(null),
    cuenta_credito: this.fb.control<ErpSelectOption | null>(null),
  });

  constructor() {
    // Rehidrata el form cada vez que se abre con una provisión distinta.
    effect(() => {
      const provision = this.provision();
      if (!this.visible() || !provision) return;
      this.form.reset(configuracionProvisionToForm(provision));
      this.form.markAsPristine();
    });
  }

  protected onSubmit(): void {
    const provision = this.provision();
    if (!provision || this.isSaving()) return;

    const toasts = this.t().configuracion.humano.provision.toasts;
    this.isSaving.set(true);

    const payload = configuracionProvisionFormToPayload(
      this.form.getRawValue(),
      this.llevaCredito(),
    );

    this.service
      .update(provision.id, payload)
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
