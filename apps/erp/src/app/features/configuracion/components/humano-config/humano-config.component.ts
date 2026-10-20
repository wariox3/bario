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
import { HUMANO_CAMPOS } from '../../configuracion.constants';
import { configuracionToHumanoForm, humanoFormToPayload } from '../../configuracion.mapper';
import { AporteTableComponent } from './aporte-table/aporte-table.component';
import { ConceptoNominaTableComponent } from './concepto-nomina-table/concepto-nomina-table.component';
import { ProvisionTableComponent } from './provision-table/provision-table.component';

/** Campos del backend (prefijados) → controles del form (sin prefijo). */
const HUMANO_FIELD_MAP = {
  hum_salario_minimo: 'salario_minimo',
  hum_factor: 'factor',
  hum_auxilio_transporte: 'auxilio_transporte',
  hum_licencia_no_remunerada_afecta_pension: 'licencia_no_remunerada_afecta_pension',
};

/** Pestañas de la tarjeta de cuentas y conceptos (`?tab=`). La primera es la de por defecto. */
const CUENTAS_TABS = ['conceptos-nomina', 'conceptos', 'provision', 'aporte'] as const;
type CuentasTab = (typeof CUENTAS_TABS)[number];

function esCuentasTab(value: string | null): value is CuentasTab {
  return (CUENTAS_TABS as readonly (string | null)[]).includes(value);
}

/**
 * Área "Humano" de la configuración: parámetros de nómina
 * (`hum_salario_minimo`, `hum_factor`, `hum_auxilio_transporte`,
 * `hum_licencia_no_remunerada_afecta_pension`).
 *
 * Auto-contenida: lee y guarda solo sus campos (`HUMANO_CAMPOS`). Estos valores
 * alimentan los cálculos de prestaciones/nómina.
 *
 * Debajo, en su propia tarjeta con pestañas, lo que dice a la nómina qué
 * concepto usar y a qué cuentas contabilizar: conceptos de nómina, cuentas por
 * concepto, provisión y aporte. Cada pestaña guarda contra su propio endpoint.
 */
@Component({
  selector: 'app-humano-config',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    TabsModule,
    FieldErrorComponent,
    FocusInvalidDirective,
    ConceptoNominaTableComponent,
    ProvisionTableComponent,
    AporteTableComponent,
  ],
  templateUrl: './humano-config.component.html',
})
export class HumanoConfigComponent {
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

  /** Pestaña activa de cuentas y conceptos; un `?tab=` desconocido cae a la primera. */
  protected readonly cuentasTab = computed((): CuentasTab => {
    const tab = this.queryParams()?.get('tab') ?? null;
    return esCuentasTab(tab) ? tab : CUENTAS_TABS[0];
  });

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    salario_minimo: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    factor: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    auxilio_transporte: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    licencia_no_remunerada_afecta_pension: this.fb.nonNullable.control(false),
  });

  constructor() {
    this.cargar();
  }

  protected onCuentasTabChange(tab: CuentasTab): void {
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
      .obtener(HUMANO_CAMPOS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.form.reset(configuracionToHumanoForm(config));
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
    const payload = humanoFormToPayload(this.form.getRawValue());

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
          this.formErrors.handle(this.form, err, toasts.saveError.title, HUMANO_FIELD_MAP);
        },
      });
  }
}
