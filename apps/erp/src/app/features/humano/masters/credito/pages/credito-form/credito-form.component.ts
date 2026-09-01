import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { FieldErrorComponent, FocusInvalidDirective, PageActionsComponent } from '@reddoc/ui';
import {
  formatCop,
  FormErrorService,
  I18nService,
  TenantService,
  ToastService,
  startOfToday,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { ContratoAutocompleteComponent, type ContratoOption } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { CreditoService } from '../../credito.service';
import { CONCEPTO_ENDPOINT, CREDITO_LIST_PATH, CONCEPTO_PARAMS } from '../../credito.constants';
import { creditoToFormValue, formValueToPayload } from '../../credito.mapper';
import { montoPositivo } from '../../../../shared/monto-positivo.validator';
import {
  cuotaNoSuperaTotal,
  cuotaSugerida,
  cuotasNecesarias,
  mismoMontoVisible,
  planDeCuotas,
  type PlanDeCuotas,
} from '../../utils/credito-cuotas';

/**
 * Formulario de alta/edición de crédito de empleado.
 *
 * Master del módulo Humano (camino B). La misma página cubre crear y editar: sin
 * `:id` → alta (sugiere hoy en fecha_inicio); con `:id` → edición. `contrato` usa
 * `<lib-contrato-autocomplete>` y `concepto` usa `<lib-api-autocomplete>` (búsqueda
 * por `nombre__icontains`).
 */
@Component({
  selector: 'app-credito-form',
  standalone: true,
  imports: [
    FocusInvalidDirective,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputNumberModule,
    DatePickerModule,
    CheckboxModule,
    FieldErrorComponent,
    PageActionsComponent,
    ContratoAutocompleteComponent,
    ErpApiSelectComponent,
  ],
  templateUrl: './credito-form.component.html',
  styleUrl: './credito-form.component.scss',
})
export class CreditoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly creditoService = inject(CreditoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly conceptoEndpoint = CONCEPTO_ENDPOINT;
  protected readonly conceptoParams = CONCEPTO_PARAMS;

  /** Id del crédito a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.credito.name,
        routerLink: slug ? ['/t', slug, ...CREDITO_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group(
    {
      contrato: this.fb.control<ContratoOption | null>(null, Validators.required),
      concepto: this.fb.control<ErpSelectOption | null>(null, Validators.required),
      fecha_inicio: this.fb.control<Date | null>(null, Validators.required),
      total: this.fb.control<number | null>(null, [Validators.required, montoPositivo]),
      cuota: this.fb.control<number | null>(null, [Validators.required, montoPositivo]),
      cantidad_cuotas: this.fb.control<number | null>(null, [Validators.required, montoPositivo]),
      inactivo: [false],
      aplica_prima: [false],
      aplica_cesantia: [false],
    },
    // Compara dos campos, así que vive en el grupo y no en un control.
    { validators: cuotaNoSuperaTotal },
  );

  /** Valor del form como signal, para derivar el plan de cuotas sin suscripciones. */
  private readonly valores = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  /**
   * Cómo queda el crédito con lo que se lleva escrito. No es una advertencia: la
   * cantidad de cuotas se deriva sola, así que siempre cuadra. Está para
   * confirmar lo que se va a crear —sobre todo cuando la última cuota es menor,
   * que es lo normal si el total no se divide exacto—.
   */
  protected readonly plan = computed<PlanDeCuotas | null>(() => {
    const v = this.valores();
    return planDeCuotas(v.total ?? null, v.cuota ?? null, v.cantidad_cuotas ?? null);
  });

  /** Resumen en palabras: «10 cuotas de $ 1.000» / «… y una final de $ 1.000». */
  protected readonly planTexto = computed(() => {
    const plan = this.plan();
    const cuota = this.valores().cuota ?? 0;
    if (!plan || !cuota) return '';
    const m = this.t().entities.credito.form.plan;

    // Se compara como se imprime: una diferencia de centavos no se ve, y
    // anunciar «una final de $ 10.909» junto a cuotas de $ 10.909 no dice nada.
    if (mismoMontoVisible(plan.ultima, cuota)) {
      return m.exacto.replace('{cuotas}', String(plan.cuotas)).replace('{monto}', formatCop(cuota));
    }
    return m.conFinal
      .replace('{cuotas}', String(plan.cuotas - 1))
      .replace('{monto}', formatCop(cuota))
      .replace('{final}', formatCop(plan.ultima));
  });

  constructor() {
    // Se pacta un monto y un plazo, y la cuota es lo que se quiere averiguar:
    // por eso va última y se llena sola. Tocar el total o la cantidad la
    // recalcula, así nada cambia por encima de donde se está escribiendo.
    this.form.controls.total.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.derivarCuota());
    this.form.controls.cantidad_cuotas.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.derivarCuota());

    // Camino inverso: quien pacta el descuento por período escribe la cuota y
    // la cantidad se ajusta. El campo que se toca manda.
    this.form.controls.cuota.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.derivarCantidad());
  }

  /** `emitEvent: false` en los dos: si no, cada cálculo dispararía el otro. */
  private derivarCantidad(): void {
    const { total, cuota } = this.form.getRawValue();
    const cuotas = cuotasNecesarias(total, cuota);
    if (cuotas !== null) {
      this.form.controls.cantidad_cuotas.setValue(cuotas, { emitEvent: false });
    }
  }

  private derivarCuota(): void {
    const { total, cantidad_cuotas } = this.form.getRawValue();
    const sugerida = cuotaSugerida(total, cantidad_cuotas);
    if (sugerida !== null) this.form.controls.cuota.setValue(sugerida, { emitEvent: false });
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.loadCredito(Number(id));
    } else {
      this.form.patchValue({ fecha_inicio: startOfToday() });
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.credito.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.creditoService.update(Number(id), payload)
      : this.creditoService.create(payload);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSaving.set(false);
        const ok = id ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(ok.title, ok.desc);
        this.navigateToList();
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        const fail = id ? toasts.editError : toasts.createError;
        this.formErrors.handle(this.form, err, fail.title);
      },
    });
  }

  protected onCancel(): void {
    this.navigateToList();
  }

  private loadCredito(id: number): void {
    this.creditoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // `emitEvent: false`: cargar un crédito guardado no debe recalcular su cuota.
        next: (c) => this.form.patchValue(creditoToFormValue(c), { emitEvent: false }),
        error: () => {
          const toasts = this.t().entities.credito.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...CREDITO_LIST_PATH]);
  }
}
