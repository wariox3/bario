import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { FieldErrorComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, ToastService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ConfiguracionService } from '../../configuracion.service';
import { VENTA_FORMATO_CAMPOS } from '../../configuracion.constants';
import {
  configuracionToVentaFormatoForm,
  ventaFormatoFormToPayload,
} from '../../configuracion.mapper';

/** Campos del backend (prefijados) → controles del form (sin prefijo). */
const VENTA_FORMATO_FIELD_MAP = {
  ven_factura_informacion_superior: 'informacion_superior',
  ven_factura_informacion_inferior: 'informacion_inferior',
};

/** Tope de cada texto: el del ERP anterior (la columna del backend no tiene). */
const INFORMACION_MAX = 2000;

/**
 * Sub-pestaña "Formato" de Venta: los textos libres que la factura impresa lleva
 * arriba y abajo (`ven_factura_informacion_superior` / `_inferior`).
 *
 * Auto-contenida: lee y guarda solo sus campos (`VENTA_FORMATO_CAMPOS`). Ambos
 * son opcionales; vaciar uno lo borra.
 */
@Component({
  selector: 'app-venta-formato-config',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, TextareaModule, FieldErrorComponent],
  templateUrl: './venta-formato-config.component.html',
})
export class VentaFormatoConfigComponent {
  private readonly fb = inject(FormBuilder);
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly informacionMax = INFORMACION_MAX;

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    informacion_superior: ['', Validators.maxLength(INFORMACION_MAX)],
    informacion_inferior: ['', Validators.maxLength(INFORMACION_MAX)],
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.configuracionService
      .obtener(VENTA_FORMATO_CAMPOS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.form.reset(configuracionToVentaFormatoForm(config));
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
    const payload = ventaFormatoFormToPayload(this.form.getRawValue());

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
          this.formErrors.handle(this.form, err, toasts.saveError.title, VENTA_FORMATO_FIELD_MAP);
        },
      });
  }
}
