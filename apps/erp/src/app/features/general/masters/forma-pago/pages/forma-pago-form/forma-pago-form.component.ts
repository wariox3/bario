import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FieldErrorComponent, FocusInvalidDirective, PageActionsComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import type { ErpSelectOption } from '@reddoc/core';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { FormaPagoService } from '../../forma-pago.service';
import { FORMA_PAGO_LIST_PATH } from '../../forma-pago.constants';
import { formValueToPayload, formaPagoToFormValue } from '../../forma-pago.mapper';

/**
 * Formulario de alta/edición de forma de pago.
 *
 * Master del módulo General (camino B) cableado en Compra. La misma página
 * cubre crear y editar: sin `:id` → alta; con `:id` → edición. Nombre obligatorio
 * y una cuenta contable opcional (selector `app-cuenta-select`). Navegación
 * module-agnostic vía `ActiveModuleStore`.
 */
@Component({
  selector: 'app-forma-pago-form',
  standalone: true,
  imports: [
    FocusInvalidDirective,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    ErpCuentaSelectComponent,
    FieldErrorComponent,
    PageActionsComponent,
  ],
  templateUrl: './forma-pago-form.component.html',
  styleUrl: './forma-pago-form.component.scss',
})
export class FormaPagoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(FormaPagoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id de la forma de pago a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const moduleId = currentModuleId(this.activeModule);
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, moduleId] : undefined,
      },
      {
        label: this.t().entities.formaPago.name,
        routerLink: slug ? ['/t', slug, moduleId, ...FORMA_PAGO_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    nombre: this.fb.control<string>('', [Validators.required, Validators.maxLength(100)]),
    cuenta: this.fb.control<ErpSelectOption | null>(null),
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadFormaPago(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.formaPago.form.toasts;
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

  private loadFormaPago(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (m) => this.form.patchValue(formaPagoToFormValue(m)),
        error: () => {
          const toasts = this.t().entities.formaPago.form.toasts;
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
      ...FORMA_PAGO_LIST_PATH,
    ]);
  }
}
