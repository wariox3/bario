import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ErpApiSelectComponent, FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  SELECT_ENDPOINTS,
  ToastService,
  type ErpSelectOption,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ConfiguracionService } from '../../configuracion.service';
import { COMPRA_CAMPOS } from '../../configuracion.constants';
import { compraFormToPayload, configuracionToCompraForm } from '../../configuracion.mapper';

/**
 * Área "Compra" de la configuración: la persona que recibe en la recepción de
 * documentos (`com_recepcion_recibe`, un JSON). El acuse de recibo (030) y el
 * recibo del bien o servicio (032) la llevan obligatoria; esta es la que se
 * sugiere al registrarlos.
 *
 * Auto-contenida: lee y guarda solo `COMPRA_CAMPOS`. Los errores del backend
 * llegan anidados en el JSON, así que se muestran en el toast.
 */
@Component({
  selector: 'app-compra-config',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    ErpApiSelectComponent,
    FieldErrorComponent,
    FocusInvalidDirective,
  ],
  templateUrl: './compra-config.component.html',
})
export class CompraConfigComponent {
  private readonly fb = inject(FormBuilder);
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly endpoints = SELECT_ENDPOINTS;

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    identificacion: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    numero_identificacion: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(20),
    ]),
    nombres: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    apellidos: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    cargo: this.fb.nonNullable.control('', Validators.maxLength(100)),
    area: this.fb.nonNullable.control('', Validators.maxLength(100)),
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.configuracionService
      .obtener(COMPRA_CAMPOS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.form.reset(configuracionToCompraForm(config));
          this.form.markAsPristine();
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadFailed.set(true);
          const toasts = this.t().configuracion.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  protected onSave(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().configuracion.toasts;
    const payload = compraFormToPayload(this.form.getRawValue());

    this.configuracionService
      .actualizar(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.form.markAsPristine();
          this.toast.success(toasts.saveSuccess.title, toasts.saveSuccess.desc);
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.formErrors.handle(this.form, err, toasts.saveError.title);
        },
      });
  }
}
