import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FieldErrorComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, SELECT_ENDPOINTS, ToastService } from '@reddoc/core';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { calcularDigitoVerificacion } from '@erp/features/general/masters/contacto/utils/digito-verificacion.util';
import type { AppDict } from '@erp/i18n';
import { ConfiguracionService } from '../../configuracion.service';
import { EMPRESA_CAMPOS } from '../../configuracion.constants';
import { configuracionToEmpresaForm, empresaFormToPayload } from '../../configuracion.mapper';

/**
 * Área "Empresa" — datos de identidad de la empresa (`gen_empresa_*`).
 *
 * PARQUEADA: el componente está completo y funcional pero **no está enchufado a
 * ninguna pestaña** todavía (a la espera de decisión de producto). Mismo patrón
 * auto-contenido que las demás áreas: lee y guarda solo sus campos
 * (`EMPRESA_CAMPOS`). Para habilitarla, sumar un `p-tabpanel` en el shell.
 */
@Component({
  selector: 'app-empresa-config',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    FieldErrorComponent,
    ErpApiSelectComponent,
  ],
  templateUrl: './empresa-config.component.html',
})
export class EmpresaConfigComponent {
  private readonly fb = inject(FormBuilder);
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Endpoints `seleccionar` de catálogos compartidos, para los `<app-api-*>` del template. */
  protected readonly endpoints = SELECT_ENDPOINTS;

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    nombre_corto: this.fb.nonNullable.control('', Validators.required),
    tipo_persona: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    identificacion: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    numero_identificacion: this.fb.nonNullable.control('', Validators.required),
    digito_verificacion: this.fb.nonNullable.control({ value: '', disabled: true }),
    direccion: this.fb.nonNullable.control(''),
    ciudad: this.fb.control<ErpSelectOption | null>(null),
    telefono: this.fb.nonNullable.control(''),
    correo: this.fb.nonNullable.control('', Validators.email),
  });

  constructor() {
    this.form.controls.numero_identificacion.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((numero) =>
        this.form.controls.digito_verificacion.setValue(calcularDigitoVerificacion(numero ?? ''), {
          emitEvent: false,
        }),
      );

    this.cargar();
  }

  protected cargar(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.configuracionService
      .obtener(EMPRESA_CAMPOS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.form.reset(configuracionToEmpresaForm(config));
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
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);

    const toasts = this.t().configuracion.toasts;
    const payload = empresaFormToPayload(this.form.getRawValue());

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
