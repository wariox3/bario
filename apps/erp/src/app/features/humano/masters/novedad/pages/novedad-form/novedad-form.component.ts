import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { FieldErrorComponent, PageActionsComponent } from '@reddoc/ui';
import {
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
import { SELECT_ENDPOINTS } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { NovedadService } from '../../novedad.service';
import {
  NOVEDAD_LIST_PATH,
  NOVEDAD_REFERENCIA_CONTRATO_PARAM,
  NOVEDAD_REFERENCIA_ENDPOINT,
  NOVEDAD_REFERENCIA_TIPO_PARAM,
} from '../../novedad.constants';
import { esVacaciones, requiereReferencia } from '../../novedad.rules';
import { dateRangeValidator } from '../../utils/date-range.validator';
import { novedadToFormValue, formValueToPayload } from '../../novedad.mapper';

/**
 * Formulario de alta/edición de novedad.
 *
 * Master del módulo Humano (camino B) con lógica condicional por tipo de novedad:
 * - **Vacaciones**: habilita y vuelve requeridos periodo + días (disfrutados/dinero).
 * - **Referencia**: cuando hay tipo+contrato, ofrece elegir otra novedad como referencia.
 *
 * La decisión "qué mostrar" vive en `novedad.rules` (puro); este componente solo
 * orquesta señales, validadores y el envío. La mutación imperativa de validadores
 * está concentrada en `aplicarValidadoresVacaciones` para mantenerlo mantenible.
 */
@Component({
  selector: 'app-novedad-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputNumberModule,
    DatePickerModule,
    TextareaModule,
    FieldErrorComponent,
    PageActionsComponent,
    ContratoAutocompleteComponent,
    ErpApiSelectComponent,
  ],
  templateUrl: './novedad-form.component.html',
  styleUrl: './novedad-form.component.scss',
})
export class NovedadFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly novedadService = inject(NovedadService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly novedadTipoEndpoint = SELECT_ENDPOINTS.novedadTipo;
  protected readonly novedadReferenciaEndpoint = NOVEDAD_REFERENCIA_ENDPOINT;
  /** Referencia estable para no re-disparar el fetch del selector en cada ciclo de CD. */
  protected readonly tipoParams: Record<string, string> = { limit: '100' };

  /** Id de la novedad a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  /** Espejo del id del tipo/contrato elegidos — alimentan las reglas de visibilidad. */
  private readonly tipoId = signal<number | null>(null);
  private readonly contratoId = signal<number | null>(null);

  protected readonly mostrarVacaciones = computed(() => esVacaciones(this.tipoId()));
  protected readonly mostrarReferencia = computed(() =>
    requiereReferencia(this.tipoId(), this.contratoId()),
  );

  /** Filtros del selector de referencia: se recargan al cambiar contrato o tipo. */
  protected readonly referenciaParams = computed<Record<string, string>>(() => {
    const contrato = this.contratoId();
    const tipo = this.tipoId();
    return {
      [NOVEDAD_REFERENCIA_CONTRATO_PARAM]: contrato != null ? String(contrato) : '',
      [NOVEDAD_REFERENCIA_TIPO_PARAM]: tipo != null ? String(tipo) : '',
      limit: '100',
    };
  });

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.novedad.name,
        routerLink: slug ? ['/t', slug, ...NOVEDAD_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group(
    {
      novedad_tipo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
      contrato: this.fb.control<ContratoOption | null>(null, Validators.required),
      fecha_desde: this.fb.control<Date | null>(null, Validators.required),
      fecha_hasta: this.fb.control<Date | null>(null, Validators.required),
      detalle: [''],
      // Vacaciones (validadores aplicados dinámicamente según el tipo)
      fecha_desde_periodo: this.fb.control<Date | null>(null),
      fecha_hasta_periodo: this.fb.control<Date | null>(null),
      dias_dinero: this.fb.control<number | null>(0),
      dias_disfrutados: this.fb.control<number | null>(0),
      dias_disfrutados_reales: this.fb.control<number | null>(0),
      // Referencia
      novedad_referencia: this.fb.control<ErpSelectOption | null>(null),
    },
    {
      validators: [
        dateRangeValidator('fecha_desde', 'fecha_hasta'),
        dateRangeValidator('fecha_desde_periodo', 'fecha_hasta_periodo'),
      ],
    },
  );

  constructor() {
    // Cambios del usuario en tipo → reglas + defaults; en contrato → recomputar referencia.
    // La carga en edición usa `{ emitEvent: false }`, así que estos handlers no pisan
    // los valores cargados (los defaults solo se aplican ante interacción real).
    this.form.controls.novedad_tipo.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((option) => this.onNovedadTipoChange(option));
    this.form.controls.contrato.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((option) => this.contratoId.set(option?.id ?? null));
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.loadNovedad(Number(id));
    } else {
      const today = startOfToday();
      this.form.patchValue({ fecha_desde: today, fecha_hasta: today });
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.novedad.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.novedadService.update(Number(id), payload)
      : this.novedadService.create(payload);

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

  // ── Lógica condicional por tipo ─────────────────────────────────────────────

  /** Reacciona a un cambio de tipo iniciado por el usuario. */
  private onNovedadTipoChange(option: ErpSelectOption | null): void {
    const tipoId = option?.id ?? null;
    this.tipoId.set(tipoId);
    const vacaciones = esVacaciones(tipoId);
    this.aplicarValidadoresVacaciones(vacaciones);
    this.aplicarValoresVacaciones(vacaciones);
    // Al cambiar de tipo la referencia previa deja de ser válida.
    this.form.controls.novedad_referencia.setValue(null, { emitEvent: false });
  }

  /**
   * Activa o limpia los validadores de los campos de vacaciones. Único punto donde
   * se mutan validadores → fácil de auditar y mantener.
   */
  private aplicarValidadoresVacaciones(activo: boolean): void {
    const {
      fecha_desde_periodo,
      fecha_hasta_periodo,
      dias_dinero,
      dias_disfrutados,
      dias_disfrutados_reales,
    } = this.form.controls;

    if (activo) {
      fecha_desde_periodo.setValidators(Validators.required);
      fecha_hasta_periodo.setValidators(Validators.required);
      dias_dinero.setValidators([Validators.required, Validators.min(0)]);
      dias_disfrutados.setValidators([Validators.required, Validators.min(0)]);
      dias_disfrutados_reales.setValidators([Validators.required, Validators.min(1)]);
    } else {
      for (const control of [
        fecha_desde_periodo,
        fecha_hasta_periodo,
        dias_dinero,
        dias_disfrutados,
        dias_disfrutados_reales,
      ]) {
        control.clearValidators();
      }
    }

    for (const control of [
      fecha_desde_periodo,
      fecha_hasta_periodo,
      dias_dinero,
      dias_disfrutados,
      dias_disfrutados_reales,
    ]) {
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  /** Defaults de vacaciones — solo ante cambio del usuario (1/1/1 al activar, reset al salir). */
  private aplicarValoresVacaciones(activo: boolean): void {
    if (activo) {
      this.form.patchValue(
        { dias_dinero: 1, dias_disfrutados: 1, dias_disfrutados_reales: 1 },
        { emitEvent: false },
      );
    } else {
      this.form.patchValue(
        {
          dias_dinero: 0,
          dias_disfrutados: 0,
          dias_disfrutados_reales: 0,
          fecha_desde_periodo: null,
          fecha_hasta_periodo: null,
        },
        { emitEvent: false },
      );
    }
  }

  private loadNovedad(id: number): void {
    this.novedadService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (n) => {
          // emitEvent:false → no se disparan los handlers (que pisarían días/periodo).
          this.form.patchValue(novedadToFormValue(n), { emitEvent: false });
          this.tipoId.set(n.novedad_tipo ?? null);
          this.contratoId.set(n.contrato ?? null);
          this.aplicarValidadoresVacaciones(esVacaciones(n.novedad_tipo ?? null));
        },
        error: () => {
          const toasts = this.t().entities.novedad.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...NOVEDAD_LIST_PATH]);
  }
}
