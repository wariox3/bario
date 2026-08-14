import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { FieldErrorComponent, PageActionsComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { CuentaService } from '../../cuenta.service';
import {
  CUENTA_CLASE_ENDPOINT,
  CUENTA_CUENTA_ENDPOINT,
  CUENTA_CUENTA_RANGO,
  CUENTA_GRUPO_ENDPOINT,
  CUENTA_GRUPO_RANGO,
  CUENTA_LIST_PATH,
} from '../../cuenta.constants';
import { cuentaToFormValue, formValueToPayload } from '../../cuenta.mapper';
import { calcularRangoIds } from '../../utils/calcular-rango-ids';
import { longitudPar, noIniciaCon, soloDigitos } from '../../utils/cuenta-codigo.validators';

/**
 * Formulario de alta/edición de cuenta (PUC).
 *
 * Master del módulo Contabilidad (camino B). La misma página cubre crear y
 * editar: sin `:id` → alta; con `:id` → edición.
 *
 * Cascada `clase → grupo → cuenta`: grupo y cuenta arrancan deshabilitados y se
 * habilitan al elegir su padre. Las opciones de cada nivel se filtran por rango
 * de id (`grupoParams` / `cuentaParams`, derivados del padre) que alimenta el
 * `[params]` reactivo del `<lib-api-select>`. Al cambiar un padre se limpian sus
 * hijos.
 */
@Component({
  selector: 'app-cuenta-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    FieldErrorComponent,
    PageActionsComponent,
    ErpApiSelectComponent,
  ],
  templateUrl: './cuenta-form.component.html',
  styleUrl: './cuenta-form.component.scss',
})
export class CuentaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CuentaService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id de la cuenta a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();
  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  protected readonly claseEndpoint = CUENTA_CLASE_ENDPOINT;

  /** Etiqueta `id - nombre` para los selects del PUC (el id es el código del nivel). */
  protected readonly formatNivel = (option: ErpSelectOption): string =>
    `${option.id} - ${option.nombre}`;

  /** Espejo reactivo del id de clase/grupo seleccionados, para los params de la cascada. */
  private readonly claseId = signal<number | null>(null);
  private readonly grupoId = signal<number | null>(null);

  /** Params del select de grupo: grupos cuya id cae en el rango de la clase elegida. */
  protected readonly grupoParams = computed<Record<string, string>>(() => {
    const id = this.claseId();
    if (id == null) return {};
    const { idDesde, idHasta } = calcularRangoIds(
      id,
      CUENTA_GRUPO_RANGO.multiplicador,
      CUENTA_GRUPO_RANGO.desplazamiento,
    );
    const params: Record<string, string> = {
      id__gte: String(idDesde),
      id__lte: String(idHasta),
      ordering: 'id',
      limit: '100',
    };
    return params;
  });

  /** Params del select de cuenta: cuentas cuya id cae en el rango del grupo elegido. */
  protected readonly cuentaParams = computed<Record<string, string>>(() => {
    const id = this.grupoId();
    if (id == null) return {};
    const { idDesde, idHasta } = calcularRangoIds(
      id,
      CUENTA_CUENTA_RANGO.multiplicador,
      CUENTA_CUENTA_RANGO.desplazamiento,
    );
    const params: Record<string, string> = {
      id__gte: String(idDesde),
      id__lte: String(idHasta),
      ordering: 'id',
      limit: '100',
    };
    return params;
  });

  protected readonly grupoEndpoint = CUENTA_GRUPO_ENDPOINT;
  protected readonly cuentaEndpoint = CUENTA_CUENTA_ENDPOINT;

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.contabilidad.name,
        routerLink: slug ? ['/t', slug, 'contabilidad'] : undefined,
      },
      {
        label: this.t().entities.cuenta.name,
        routerLink: slug ? ['/t', slug, ...CUENTA_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    codigo: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.maxLength(8),
      soloDigitos(),
      longitudPar(),
      noIniciaCon('0'),
    ]),
    nombre: this.fb.control<string>('', [Validators.required, Validators.maxLength(100)]),
    cuenta_clase: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    cuenta_grupo: this.fb.control<ErpSelectOption | null>(
      { value: null, disabled: true },
      Validators.required,
    ),
    cuenta_cuenta: this.fb.control<ErpSelectOption | null>(
      { value: null, disabled: true },
      Validators.required,
    ),
    exige_base: this.fb.control<boolean>(false),
    exige_contacto: this.fb.control<boolean>(false),
    exige_grupo: this.fb.control<boolean>(false),
    permite_movimiento: this.fb.control<boolean>(false),
  });

  constructor() {
    // Cascada: al cambiar la clase se resetea/habilita el grupo; al cambiar el
    // grupo se resetea/habilita la cuenta. `valueChanges` también dispara en la
    // carga de edición, por eso ahí parcheamos con `emitEvent: false`.
    this.form.controls.cuenta_clase.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.onClaseChange(value));
    this.form.controls.cuenta_grupo.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.onGrupoChange(value));
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadCuenta(Number(id));
  }

  /** Clase elegida → resetea grupo (que cascada a cuenta) y lo habilita/inhabilita. */
  private onClaseChange(value: ErpSelectOption | null): void {
    this.claseId.set(value?.id ?? null);
    const grupo = this.form.controls.cuenta_grupo;
    grupo.setValue(null);
    if (value) grupo.enable();
    else grupo.disable();
  }

  /** Grupo elegido → resetea cuenta y la habilita/inhabilita. */
  private onGrupoChange(value: ErpSelectOption | null): void {
    this.grupoId.set(value?.id ?? null);
    const cuenta = this.form.controls.cuenta_cuenta;
    cuenta.setValue(null);
    if (value) cuenta.enable();
    else cuenta.disable();
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.cuenta.form.toasts;
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

  /**
   * Carga la cuenta en edición. Parchea con `emitEvent: false` para no disparar
   * la cascada (que borraría grupo/cuenta) y sincroniza manualmente los espejos
   * de id y la habilitación de los selects hijos.
   */
  private loadCuenta(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          const value = cuentaToFormValue(c);
          this.form.patchValue(value, { emitEvent: false });
          if (value.cuenta_clase) {
            this.claseId.set(value.cuenta_clase.id);
            this.form.controls.cuenta_grupo.enable({ emitEvent: false });
          }
          if (value.cuenta_grupo) {
            this.grupoId.set(value.cuenta_grupo.id);
            this.form.controls.cuenta_cuenta.enable({ emitEvent: false });
          }
        },
        error: () => {
          const toasts = this.t().entities.cuenta.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...CUENTA_LIST_PATH]);
  }
}
