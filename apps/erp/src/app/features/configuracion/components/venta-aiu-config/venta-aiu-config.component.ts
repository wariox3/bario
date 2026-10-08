import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { FormErrorService, I18nService, ToastService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import {
  ErpItemAutocompleteComponent,
  type ItemOption,
} from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';
import { ConfiguracionService } from '../../configuracion.service';
import { VENTA_AIU_CAMPOS } from '../../configuracion.constants';
import { configuracionToVentaAiuForm, ventaAiuFormToPayload } from '../../configuracion.mapper';

/** Campos del backend (prefijados) → controles del form (sin prefijo). */
const VENTA_AIU_FIELD_MAP = {
  ven_item_administracion: 'item_administracion',
  ven_item_imprevisto: 'item_imprevisto',
  ven_item_utilidad: 'item_utilidad',
};

/**
 * Sub-pestaña "AIU" de Venta: los ítems con que la factura liquida la
 * administración, el imprevisto y la utilidad (`ven_item_*`, FK a `GenItem`).
 *
 * Auto-contenida: lee y guarda solo sus campos (`VENTA_AIU_CAMPOS`). Los tres son
 * opcionales; limpiar uno lo desvincula.
 */
@Component({
  selector: 'app-venta-aiu-config',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, ErpItemAutocompleteComponent],
  templateUrl: './venta-aiu-config.component.html',
})
export class VentaAiuConfigComponent {
  private readonly fb = inject(FormBuilder);
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    item_administracion: this.fb.control<ItemOption | null>(null),
    item_imprevisto: this.fb.control<ItemOption | null>(null),
    item_utilidad: this.fb.control<ItemOption | null>(null),
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.configuracionService
      .obtener(VENTA_AIU_CAMPOS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.form.reset(configuracionToVentaAiuForm(config));
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
    if (this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().configuracion.toasts;
    const payload = ventaAiuFormToPayload(this.form.getRawValue());

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
          this.formErrors.handle(this.form, err, toasts.saveError.title, VENTA_AIU_FIELD_MAP);
        },
      });
  }
}
