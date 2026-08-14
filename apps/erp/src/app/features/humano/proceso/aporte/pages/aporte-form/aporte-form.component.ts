import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ErpApiSelectComponent, FieldErrorComponent, PageActionsComponent } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  TenantService,
  ToastService,
  startOfToday,
  type ErpSelectOption,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { ConfiguracionService } from '@erp/core/services/configuracion.service';
import {
  APORTE_LIST_PATH,
  ENTIDAD_ENDPOINT,
  ENTIDAD_ICBF_PARAMS,
  ENTIDAD_RIESGO_PARAMS,
  ENTIDAD_SENA_PARAMS,
  SUCURSAL_ENDPOINT,
} from '../../aporte.constants';
import { aporteToFormValue, formValueToPayload } from '../../aporte.mapper';
import { PRESENTACION, type Aporte, type Presentacion } from '../../aporte.model';
import { capacidadesDe } from '../../aporte.estado';
import { AporteService } from '../../aporte.service';

/** Rango de años aceptado. Acota errores de tecleo, no reglas de negocio. */
const ANIO_MIN = 2000;
const ANIO_MAX = 2100;

/** Campo de la configuración de empresa con la ARL por defecto. */
const CAMPO_ENTIDAD_RIESGO = 'hum_entidad_riesgo_id';

/**
 * Alta y edición de la **cabecera** de un aporte a seguridad social: el periodo
 * (año y mes), el alcance (sucursal y forma de presentación) y las tres entidades
 * que no salen del contrato sino de la planilla.
 *
 * El periodo se declara como año + mes y no como rango de fechas: `fecha_desde` y
 * `fecha_hasta` las calcula el backend.
 *
 * Tres defaults al crear, para no arrancar con siete campos vacíos:
 *
 * - **Año y mes** en el periodo en curso.
 * - **ARL** desde `hum_entidad_riesgo_id` de la configuración de la empresa.
 * - **SENA e ICBF** en la primera opción del catálogo (`suggestedIndex`), que es
 *   lo que hace el ERP anterior a mano.
 *
 * El formulario **solo se abre sobre un borrador**: un aporte generado tiene la
 * cabecera congelada (`capacidadesDe`). Si se entra por URL a uno que ya no lo es,
 * se redirige al workspace en vez de dejar editar.
 */
@Component({
  selector: 'app-aporte-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputNumberModule,
    SelectModule,
    FieldErrorComponent,
    PageActionsComponent,
    ErpApiSelectComponent,
  ],
  templateUrl: './aporte-form.component.html',
  styleUrl: './aporte-form.component.scss',
})
export class AporteFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AporteService);
  private readonly configuracion = inject(ConfiguracionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly sucursalEndpoint = SUCURSAL_ENDPOINT;
  protected readonly entidadEndpoint = ENTIDAD_ENDPOINT;
  protected readonly entidadRiesgoParams = ENTIDAD_RIESGO_PARAMS;
  protected readonly entidadSenaParams = ENTIDAD_SENA_PARAMS;
  protected readonly entidadIcbfParams = ENTIDAD_ICBF_PARAMS;

  protected readonly anioMin = ANIO_MIN;
  protected readonly anioMax = ANIO_MAX;

  /** Id a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  /** Meses del año, para el selector. El valor es 1..12, como espera el backend. */
  protected readonly mesOptions = computed(() =>
    this.t().common.months.map((label, indice) => ({ label, value: indice + 1 })),
  );

  protected readonly presentacionOptions = computed(() => {
    const labels = this.t().entities.aporte.presentaciones;
    return [
      { label: labels.sucursal, value: PRESENTACION.SUCURSAL },
      { label: labels.unica, value: PRESENTACION.UNICA },
    ];
  });

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.aporte.name,
        routerLink: slug ? ['/t', slug, ...APORTE_LIST_PATH] : undefined,
      },
      {
        label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new,
      },
    ];
  });

  protected readonly form = this.fb.group({
    sucursal: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    anio: this.fb.control<number | null>(anioActual(), [
      Validators.required,
      Validators.min(ANIO_MIN),
      Validators.max(ANIO_MAX),
    ]),
    mes: this.fb.control<number | null>(mesActual(), Validators.required),
    presentacion: this.fb.control<Presentacion>(PRESENTACION.SUCURSAL, { nonNullable: true }),
    entidad_riesgo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    entidad_sena: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    entidad_icbf: this.fb.control<ErpSelectOption | null>(null, Validators.required),
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadAporte(Number(id));
    else this.sugerirEntidadRiesgo();
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;

    const id = this.id();
    const toasts = this.t().entities.aporte.form.toasts;
    const payload = formValueToPayload(this.form.getRawValue());

    this.isSaving.set(true);
    const operation = id ? this.service.update(Number(id), payload) : this.service.create(payload);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        const ok = id ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(ok.title, ok.desc);
        // Al crear se entra al workspace: es donde se cargan los contratos y se
        // liquida. En edición se vuelve al mismo aporte.
        this.navigateTo('detalle', saved?.id ?? Number(id));
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        const fail = id ? toasts.editError : toasts.createError;
        this.formErrors.handle(this.form, err, fail.title);
      },
    });
  }

  protected onCancel(): void {
    const id = this.id();
    if (id) this.navigateTo('detalle', Number(id));
    else this.navigateTo();
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /**
   * Siembra la ARL con la que la empresa tiene configurada.
   *
   * Se patchea solo el id: `<lib-api-select>` compara por `dataKey="id"`, así que
   * cuando el catálogo responde el nombre lo pone la opción cargada. Si la
   * configuración no la tiene, el campo queda vacío y el usuario elige — no es un
   * error que valga un toast.
   *
   * ⚠️ El ERP anterior pide el campo como `hum_entidad_riesgo`; acá se usa
   * `hum_entidad_riesgo_id`, que es como lo declara la configuración de empresa
   * (`configuracion.model.ts`). Si el backend responde con el otro nombre, el
   * campo queda vacío sin avisar.
   */
  private sugerirEntidadRiesgo(): void {
    this.configuracion
      .getCampos([CAMPO_ENTIDAD_RIESGO])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (campos) => {
          const id = campos[CAMPO_ENTIDAD_RIESGO];
          if (id == null || this.form.controls.entidad_riesgo.value !== null) return;
          this.form.controls.entidad_riesgo.setValue({ id, nombre: '' });
        },
        error: () => {
          // Pre-llenado opcional: si falla, el usuario elige la ARL a mano.
        },
      });
  }

  private loadAporte(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (read: Aporte) => {
          // Puerta de edición: un aporte generado o aprobado no se edita, ni
          // siquiera entrando por URL. Se manda al workspace, que sí aplica.
          if (!capacidadesDe(read).puedeEditarCabecera) {
            const toast = this.t().entities.aporte.form.toasts.noEditable;
            this.toast.warn(toast.title, toast.desc);
            this.navigateTo('detalle', id);
            return;
          }
          this.form.patchValue(aporteToFormValue(read), { emitEvent: false });
        },
        error: () => {
          const toasts = this.t().entities.aporte.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateTo(segment?: string, id?: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const commands: (string | number)[] = ['/t', slug, ...APORTE_LIST_PATH];
    if (segment) commands.push(segment);
    if (id != null) commands.push(id);
    void this.router.navigate(commands);
  }
}

function anioActual(): number {
  return startOfToday().getFullYear();
}

/** Mes en curso en base 1: el backend acepta 1..12, no el 0..11 de `Date`. */
function mesActual(): number {
  return startOfToday().getMonth() + 1;
}
