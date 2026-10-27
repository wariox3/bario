import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { TabsModule } from 'primeng/tabs';
import { FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import { FormErrorService, I18nService, ToastService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ConfiguracionService } from '../../configuracion.service';
import { GENERAL_CAMPOS } from '../../configuracion.constants';
import { configuracionToGeneralForm, generalFormToPayload } from '../../configuracion.mapper';
import { DocumentoTipoTableComponent } from './documento-tipo-table/documento-tipo-table.component';
import { ImpuestoTableComponent } from './impuesto-table/impuesto-table.component';

/** Campos del backend (prefijados) → controles del form (sin prefijo). */
const GENERAL_FIELD_MAP = {
  gen_uvt: 'uvt',
  gen_emitir_automaticamente: 'emitir_automaticamente',
  gen_contabilizar_automaticamente: 'contabilizar_automaticamente',
};

/** Pestañas de la tarjeta de catálogos (`?tab=`). La primera es la de por defecto. */
const CATALOGO_TABS = ['documentos', 'impuestos'] as const;
type CatalogoTab = (typeof CATALOGO_TABS)[number];

function esCatalogoTab(value: string | null): value is CatalogoTab {
  return (CATALOGO_TABS as readonly (string | null)[]).includes(value);
}

/**
 * Área "General" de la configuración: la UVT (`gen_uvt`), la emisión
 * automática de documentos electrónicos (`gen_emitir_automaticamente`) y la
 * contabilización automática (`gen_contabilizar_automaticamente`).
 *
 * Auto-contenida: lee y guarda solo sus campos (`GENERAL_CAMPOS`). La UVT es la
 * base de los cálculos fiscales, por eso vive en su propia sección destacada;
 * la emisión automática va en la suya porque no es un parámetro de cálculo sino
 * una decisión sobre cómo salen los documentos hacia la DIAN. La contabilización
 * automática es la misma clase de decisión al aprobar, pero sobre la
 * contabilidad: por eso tiene su propio grupo y no comparte el de la DIAN.
 *
 * Debajo, en su propia tarjeta con pestañas, los catálogos normativos que cada
 * empresa ajusta: tipos de documento e impuestos.
 */
@Component({
  selector: 'app-general-config',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    TabsModule,
    FieldErrorComponent,
    FocusInvalidDirective,
    DocumentoTipoTableComponent,
    ImpuestoTableComponent,
  ],
  templateUrl: './general-config.component.html',
})
export class GeneralConfigComponent {
  private readonly fb = inject(FormBuilder);
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly t = this.i18n.t;

  private readonly queryParams = toSignal(this.route.queryParamMap);

  /** Pestaña activa de los catálogos; un `?tab=` desconocido cae a la primera. */
  protected readonly catalogoTab = computed((): CatalogoTab => {
    const tab = this.queryParams()?.get('tab') ?? null;
    return esCatalogoTab(tab) ? tab : CATALOGO_TABS[0];
  });

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    uvt: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    emitir_automaticamente: this.fb.nonNullable.control(false),
    contabilizar_automaticamente: this.fb.nonNullable.control(false),
  });

  constructor() {
    this.cargar();
  }

  protected onCatalogoTabChange(tab: CatalogoTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  protected cargar(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.configuracionService
      .obtener(GENERAL_CAMPOS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.form.reset(configuracionToGeneralForm(config));
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
    const payload = generalFormToPayload(this.form.getRawValue());

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
          this.formErrors.handle(this.form, err, toasts.saveError.title, GENERAL_FIELD_MAP);
        },
      });
  }
}
