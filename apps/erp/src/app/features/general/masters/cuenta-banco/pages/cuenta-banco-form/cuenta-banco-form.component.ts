import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FieldErrorComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { CuentaBancoService } from '../../cuenta-banco.service';
import {
  CUENTA_BANCO_CLASE_ENDPOINT,
  CUENTA_BANCO_LIST_PATH,
  CUENTA_BANCO_TIPO_CAJA,
  CUENTA_BANCO_TIPO_ENDPOINT,
} from '../../cuenta-banco.constants';
import { cuentaBancoToFormValue, formValueToPayload } from '../../cuenta-banco.mapper';

/**
 * Formulario de alta/edición de cuenta de banco.
 *
 * Master del módulo General (camino B). Replica la regla del legacy: el tipo
 * "caja" ({@link CUENTA_BANCO_TIPO_CAJA}) oculta `numero_cuenta` y
 * `cuenta_banco_clase` y les quita la obligatoriedad; cualquier otro tipo los
 * muestra y los vuelve requeridos.
 */
@Component({
  selector: 'app-cuenta-banco-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    ErpApiSelectComponent,
    ErpCuentaSelectComponent,
    FieldErrorComponent,
  ],
  templateUrl: './cuenta-banco-form.component.html',
  styleUrl: './cuenta-banco-form.component.scss',
})
export class CuentaBancoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cuentaBancoService = inject(CuentaBancoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly tipoEndpoint = CUENTA_BANCO_TIPO_ENDPOINT;
  protected readonly claseEndpoint = CUENTA_BANCO_CLASE_ENDPOINT;

  /** Id de la cuenta de banco a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  /** Visibilidad de `numero_cuenta`/`cuenta_banco_clase` (oculto cuando el tipo es caja). */
  protected readonly mostrarCamposBanco = signal(false);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const moduleId = currentModuleId(this.activeModule);
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, moduleId] : undefined,
      },
      {
        label: this.t().entities.cuentaBanco.name,
        routerLink: slug ? ['/t', slug, moduleId, ...CUENTA_BANCO_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    numero_cuenta: ['', Validators.maxLength(50)],
    cuenta_banco_tipo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    cuenta_banco_clase: this.fb.control<ErpSelectOption | null>(null),
    cuenta: this.fb.control<ErpSelectOption | null>(null),
  });

  ngOnInit(): void {
    // Reacciona al cambio de tipo para aplicar la regla de negocio (caja vs banco).
    this.form.controls.cuenta_banco_tipo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tipo) => this.aplicarReglaTipo(tipo?.id ?? null, true));

    const id = this.id();
    if (id) this.loadCuentaBanco(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.cuentaBanco.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.cuentaBancoService.update(Number(id), payload)
      : this.cuentaBancoService.create(payload);

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
   * Aplica la regla del tipo: caja oculta y libera `numero_cuenta`/`cuenta_banco_clase`;
   * cualquier otro tipo los muestra y los vuelve obligatorios. Con `reset` (cambio
   * manual del usuario) limpia los valores al pasar a caja.
   */
  private aplicarReglaTipo(tipoId: number | null, reset: boolean): void {
    const numeroCuenta = this.form.controls.numero_cuenta;
    const clase = this.form.controls.cuenta_banco_clase;
    const esCaja = tipoId === CUENTA_BANCO_TIPO_CAJA;
    const ocultar = tipoId === null || esCaja;

    this.mostrarCamposBanco.set(!ocultar);

    if (ocultar) {
      numeroCuenta.setValidators(Validators.maxLength(50));
      clase.clearValidators();
      if (reset) {
        numeroCuenta.setValue('', { emitEvent: false });
        clase.setValue(null, { emitEvent: false });
      }
    } else {
      numeroCuenta.setValidators([Validators.required, Validators.maxLength(50)]);
      clase.setValidators(Validators.required);
    }

    numeroCuenta.updateValueAndValidity({ emitEvent: false });
    clase.updateValueAndValidity({ emitEvent: false });
  }

  private loadCuentaBanco(id: number): void {
    this.cuentaBancoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          // Sin reset: respeta los valores cargados al recalcular la visibilidad.
          this.aplicarReglaTipo(c.cuenta_banco_tipo, false);
          this.form.patchValue(cuentaBancoToFormValue(c));
        },
        error: () => {
          const toasts = this.t().entities.cuentaBanco.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate([
      '/t',
      slug,
      currentModuleId(this.activeModule),
      ...CUENTA_BANCO_LIST_PATH,
    ]);
  }
}
