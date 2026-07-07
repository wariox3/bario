import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { FieldErrorComponent } from '@reddoc/ui';
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
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import type { AppDict } from '@erp/i18n';
import { ActivoService } from '../../activo.service';
import {
  ACTIVO_GRUPO_ENDPOINT,
  ACTIVO_LIST_PATH,
  CENTRO_COSTO_ENDPOINT,
  METODO_DEPRECIACION_ENDPOINT,
} from '../../activo.constants';
import { activoToFormValue, formValueToPayload } from '../../activo.mapper';

/**
 * Formulario de alta/edición de activo fijo.
 *
 * Master del módulo Contabilidad (camino B). La misma página cubre crear y
 * editar: sin `:id` → alta (sugiere hoy en fecha_compra/fecha_activacion); con
 * `:id` → edición. Las FK `activo_grupo`, `metodo_depreciacion` y `centro_costo`
 * usan `<lib-api-select>`; las cuentas contables (`cuenta_gasto`,
 * `cuenta_depreciacion`) usan `<app-cuenta-select>`.
 */
@Component({
  selector: 'app-activo-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DatePickerModule,
    FieldErrorComponent,
    ErpApiSelectComponent,
    ErpCuentaSelectComponent,
  ],
  templateUrl: './activo-form.component.html',
  styleUrl: './activo-form.component.scss',
})
export class ActivoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly activoService = inject(ActivoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly activoGrupoEndpoint = ACTIVO_GRUPO_ENDPOINT;
  protected readonly metodoDepreciacionEndpoint = METODO_DEPRECIACION_ENDPOINT;
  protected readonly centroCostoEndpoint = CENTRO_COSTO_ENDPOINT;

  /** Id del activo a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.contabilidad.name,
        routerLink: slug ? ['/t', slug, 'contabilidad'] : undefined,
      },
      {
        label: this.t().entities.activo.name,
        routerLink: slug ? ['/t', slug, ...ACTIVO_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    codigo: ['', [Validators.required, Validators.maxLength(50)]],
    marca: ['', Validators.maxLength(100)],
    serie: ['', Validators.maxLength(100)],
    modelo: [null as number | null],
    fecha_compra: [null as Date | null],
    fecha_activacion: [null as Date | null],
    fecha_baja: [null as Date | null],
    duracion: [0 as number | null],
    valor_compra: [0 as number | null],
    depreciacion_inicial: [0 as number | null],
    activo_grupo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    metodo_depreciacion: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    cuenta_gasto: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    cuenta_depreciacion: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    centro_costo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.loadActivo(Number(id));
    } else {
      const today = startOfToday();
      this.form.patchValue({ fecha_compra: today, fecha_activacion: today });
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.activo.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.activoService.update(Number(id), payload)
      : this.activoService.create(payload);

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

  private loadActivo(id: number): void {
    this.activoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (a) => this.form.patchValue(activoToFormValue(a)),
        error: () => {
          const toasts = this.t().entities.activo.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...ACTIVO_LIST_PATH]);
  }
}
