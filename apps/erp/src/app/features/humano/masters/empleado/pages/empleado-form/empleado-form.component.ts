import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FieldErrorComponent } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  SELECT_ENDPOINTS,
  TenantService,
  ToastService,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { ErpApiAutocompleteComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { ContactoService } from '@erp/features/general/masters/contacto/contacto.service';
import { TIPO_PERSONA } from '@erp/features/general/masters/contacto/contacto.constants';
import {
  type NumeroIdentificacionSnapshot,
  numeroIdentificacionUnicoValidator,
} from '@erp/features/general/masters/contacto/validators/numero-identificacion-unico.validator';
import { EMPLEADO_LIST_PATH } from '../../empleado.constants';
import { empleadoToFormValue, formValueToPayload } from '../../empleado.mapper';

/**
 * Formulario de alta/edición de empleado.
 *
 * Empleado = contacto con `empleado=true` (ver `empleado.model`). Reutiliza
 * `ContactoService` y el async validator del master de contacto. Fiel al legacy:
 * el empleado siempre es **persona natural**, así que el form solo pide identidad
 * (nombres/apellidos), contacto, ubicación y datos bancarios — sin tipo de persona,
 * responsabilidad ni consulta DIAN. El tipo de persona, la responsabilidad, el
 * `nombre_corto` y el dígito de verificación se resuelven en el mapper.
 */
@Component({
  selector: 'app-empleado-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    FieldErrorComponent,
    ErpApiSelectComponent,
    ErpApiAutocompleteComponent,
  ],
  templateUrl: './empleado-form.component.html',
  styleUrl: './empleado-form.component.scss',
})
export class EmpleadoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly contactoService = inject(ContactoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Endpoints `seleccionar` de catálogos compartidos, para los `<app-api-*>` del template. */
  protected readonly endpoints = SELECT_ENDPOINTS;

  /** Id del empleado a editar (route param `:id`). Ausente en alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  /** El empleado es siempre persona natural: el tipo de identificación se filtra a ese tipo. */
  protected readonly identificacionParams: Record<string, string> = {
    tipo_persona_id: String(TIPO_PERSONA.NATURAL),
  };

  /** Snapshot del empleado cargado en edición; usado por el async validator. */
  private readonly originalIdentificacion = signal<NumeroIdentificacionSnapshot | null>(null);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.empleado.name,
        routerLink: slug ? ['/t', slug, 'humano', ...EMPLEADO_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    identificacion: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    numero_identificacion: ['', Validators.required],
    nombre1: ['', Validators.required],
    nombre2: [''],
    apellido1: ['', Validators.required],
    apellido2: [''],
    telefono: ['', Validators.required],
    celular: ['', Validators.required],
    ciudad: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    direccion: ['', Validators.required],
    barrio: [''],
    correo: ['', [Validators.required, Validators.email]],
    banco: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    numero_cuenta: ['', Validators.required],
    cuenta_banco_clase: this.fb.control<ErpSelectOption | null>(null, Validators.required),
  });

  constructor() {
    this.setupFormReactions();
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadEmpleado(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.empleado.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.contactoService.update(Number(id), payload)
      : this.contactoService.create(payload);

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

  // ── Internos ────────────────────────────────────────────────────────────────

  private setupFormReactions(): void {
    const { controls } = this.form;

    controls.numero_identificacion.addAsyncValidators(
      numeroIdentificacionUnicoValidator(
        this.contactoService,
        () => controls.identificacion.value?.id ?? null,
        () => this.originalIdentificacion(),
      ),
    );

    // Cambiar el tipo de identificación dispara la revalidación del número.
    controls.identificacion.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      controls.numero_identificacion.updateValueAndValidity();
    });
  }

  private loadEmpleado(id: number): void {
    this.contactoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.originalIdentificacion.set({
            numero_identificacion: c.numero_identificacion,
            identificacion_id: c.identificacion,
          });
          this.form.patchValue(empleadoToFormValue(c));
        },
        error: () => {
          const toasts = this.t().entities.empleado.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, 'humano', ...EMPLEADO_LIST_PATH]);
  }
}
