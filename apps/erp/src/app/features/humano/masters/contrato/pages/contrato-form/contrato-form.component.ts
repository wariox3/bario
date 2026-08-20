import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import {
  CIUDAD_FUENTE,
  FormErrorService,
  I18nService,
  TenantService,
  ToastService,
  startOfToday,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { CiudadAutocompleteComponent, FieldErrorComponent, PageActionsComponent } from '@reddoc/ui';
import { ErpApiSelectComponent } from '@reddoc/ui';
import { EmpleadoAutocompleteComponent } from '@erp/core/components/empleado-autocomplete/empleado-autocomplete.component';
import type { EmpleadoOption } from '@erp/core/components/empleado-autocomplete/empleado-autocomplete.component';
import type { ErpSelectOption } from '@reddoc/core';
import { SELECT_ENDPOINTS } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ConfiguracionService } from '@erp/core/services/configuracion.service';
import { ContratoService } from '../../contrato.service';
import { CONTRATO_LIST_PATH, CONTRATO_TIPO_INDEFINIDO_ID } from '../../contrato.constants';
import { contratoToFormValue, formValueToPayload } from '../../contrato.mapper';

/**
 * Formulario de alta/edición de contrato.
 *
 * Master del módulo Humano (camino B). La misma página cubre crear y editar:
 * sin `:id` → alta; con `:id` → edición (el id llega por `withComponentInputBinding`).
 *
 * Todas las FK están cableadas a sus endpoints `seleccionar/` vía `<lib-api-select>`
 * (`contacto` usa `<app-empleado-autocomplete>`, que pinta la identificación al lado;
 * `ciudad_contrato` / `ciudad_labora` usan `<lib-ciudad-autocomplete>`, que muestra el
 * departamento para desambiguar municipios homónimos). Las FK de humano apuntan a `/humano/<slug>/seleccionar/`
 * y `centro_costo` a `/contabilidad/centro-costo/seleccionar/`. Las cuatro entidades de
 * seguridad social (`entidad_salud`, `entidad_pension`, `entidad_cesantias`, `entidad_caja`)
 * comparten el endpoint `/humano/entidad/seleccionar/` discriminado por el query param
 * booleano correspondiente (`salud` / `pension` / `cesantias` / `caja`).
 *
 * Regla de negocio del tipo de contrato: si es indefinido (id
 * `CONTRATO_TIPO_INDEFINIDO_ID`) se oculta `fecha_hasta` en la UI y se le quita
 * el requerido, pero se le fija la fecha de hoy porque el backend no acepta
 * nulo. Solo en alta, al iniciar, se sugiere la fecha de hoy en
 * `fecha_desde` / `fecha_hasta`.
 */
@Component({
  selector: 'app-contrato-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    DatePickerModule,
    InputNumberModule,
    CheckboxModule,
    TextareaModule,
    FieldErrorComponent,
    PageActionsComponent,
    ErpApiSelectComponent,
    EmpleadoAutocompleteComponent,
    CiudadAutocompleteComponent,
  ],
  templateUrl: './contrato-form.component.html',
  styleUrl: './contrato-form.component.scss',
})
export class ContratoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ContratoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly configuracion = inject(ConfiguracionService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Ciudades dentro del tenant: el ERP siempre trabaja dentro de uno. */
  protected readonly ciudadFuente = CIUDAD_FUENTE.erp;

  /** Endpoints `seleccionar` de catálogos compartidos, para los `<app-api-*>` del template. */
  protected readonly endpoints = SELECT_ENDPOINTS;

  /** Id del contrato a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();
  protected readonly isEditMode = computed(() => !!this.id());

  protected readonly isSaving = signal(false);

  /** Oculta la sección "Terminación y pagos" por ahora (pendiente de definición). */
  protected readonly showTerminacion = false;

  /** Tipo de contrato seleccionado (espejo reactivo del control para la plantilla). */
  private readonly contratoTipo = signal<ErpSelectOption | null>(null);

  /** `true` cuando el tipo de contrato es indefinido → sin `fecha_hasta`. */
  protected readonly isIndefinido = computed(
    () => this.contratoTipo()?.id === CONTRATO_TIPO_INDEFINIDO_ID,
  );

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.contrato.name,
        routerLink: slug ? ['/t', slug, ...CONTRATO_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    // Datos del contrato — selectores cableados a /humano/<slug>/seleccionar/, todos obligatorios
    contacto: this.fb.control<EmpleadoOption | null>(null, Validators.required),
    contrato_tipo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    cargo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    grupo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    sucursal: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    tiempo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    fecha_desde: this.fb.control<Date | null>(null, Validators.required),
    fecha_hasta: this.fb.control<Date | null>(null, Validators.required),
    // Habilita que este contrato entre en la programación de turnos.
    habilitado_turno: this.fb.control<boolean>(false),
    // Remuneración
    salario: this.fb.control<number | null>(null, Validators.required),
    auxilio_transporte: this.fb.control<boolean>(true),
    salario_integral: this.fb.control<boolean>(false),
    tipo_costo: this.fb.control<ErpSelectOption | null>(null),
    centro_costo: this.fb.control<ErpSelectOption | null>(null),
    // Seguridad social
    salud: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    entidad_salud: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    pension: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    entidad_pension: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    entidad_cesantias: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    entidad_caja: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    riesgo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    tipo_cotizante: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    subtipo_cotizante: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    ciudad_contrato: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    ciudad_labora: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    // Terminación y pagos
    motivo_terminacion: this.fb.control<ErpSelectOption | null>(null),
    fecha_ultimo_pago: this.fb.control<Date | null>(null),
    fecha_ultimo_pago_prima: this.fb.control<Date | null>(null),
    fecha_ultimo_pago_cesantia: this.fb.control<Date | null>(null),
    fecha_ultimo_pago_vacacion: this.fb.control<Date | null>(null),
    comentario: this.fb.control<string>(''),
  });

  constructor() {
    // Aplica la regla del tipo de contrato cada vez que cambia (incluye la carga
    // en edición, que dispara `valueChanges` vía `patchValue`).
    this.form.controls.contrato_tipo.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.onContratoTipoChange(value));
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.loadContrato(Number(id));
    } else {
      this.prefillRemuneracion();
      this.suggestToday();
    }
  }

  /**
   * Regla de negocio según el tipo de contrato: si es indefinido oculta
   * `fecha_hasta` en la UI y le quita el requerido, pero el backend exige un
   * valor no nulo, así que se fija la fecha de hoy como placeholder; cualquier
   * otro tipo la vuelve requerida.
   */
  private onContratoTipoChange(value: ErpSelectOption | null): void {
    this.contratoTipo.set(value);
    const fechaHasta = this.form.controls.fecha_hasta;

    if (this.isIndefinido()) {
      fechaHasta.setValue(startOfToday(), { emitEvent: false });
      fechaHasta.clearValidators();
    } else {
      fechaHasta.setValidators(Validators.required);
    }

    fechaHasta.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Sugiere la fecha de hoy en `fecha_desde` / `fecha_hasta` al iniciar el
   * formulario en modo alta. Solo se llama al crear (nunca al editar) y respeta
   * cualquier valor ya presente.
   */
  private suggestToday(): void {
    const today = startOfToday();
    if (!this.form.controls.fecha_desde.value) this.form.controls.fecha_desde.setValue(today);
    if (!this.form.controls.fecha_hasta.value) this.form.controls.fecha_hasta.setValue(today);
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.contrato.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id ? this.service.update(Number(id), payload) : this.service.create(payload);

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

  private loadContrato(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => this.form.patchValue(contratoToFormValue(c)),
        error: () => {
          const toasts = this.t().entities.contrato.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  /**
   * Pre-llena el salario (solo en alta) con el valor de configuración del
   * sistema. Mismo patrón que `servicio-documento-form`: consume el
   * `ConfiguracionService` genérico, sin duplicar.
   */
  private prefillRemuneracion(): void {
    this.configuracion
      .getCampos(['hum_salario_minimo'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (campos) => {
          const salario = campos['hum_salario_minimo'];
          if (salario != null) this.form.controls.salario.setValue(salario);
        },
        error: () => {
          // Pre-llenado opcional: si falla, el usuario digita los valores manualmente.
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...CONTRATO_LIST_PATH]);
  }
}
