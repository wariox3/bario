import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FieldErrorComponent, FocusInvalidDirective, PageActionsComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { CentroCostoService } from '../../centro-costo.service';
import { CENTRO_COSTO_LIST_PATH } from '../../centro-costo.constants';
import { centroCostoToFormValue, formValueToPayload } from '../../centro-costo.mapper';

/**
 * Formulario de alta/edición de centro de costo.
 *
 * Master del módulo Contabilidad (camino B). La misma página cubre crear y
 * editar: sin `:id` → alta; con `:id` → edición (el id llega por
 * `withComponentInputBinding`).
 */
@Component({
  selector: 'app-centro-costo-form',
  standalone: true,
  imports: [
    FocusInvalidDirective,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    FieldErrorComponent,
    PageActionsComponent,
  ],
  templateUrl: './centro-costo-form.component.html',
  styleUrl: './centro-costo-form.component.scss',
})
export class CentroCostoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly centroCostoService = inject(CentroCostoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del centro de costo a editar (route param `:id`). Ausente en modo alta. */
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
        label: this.t().entities.centroCosto.name,
        routerLink: slug ? ['/t', slug, ...CENTRO_COSTO_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    codigo: ['', Validators.required],
    nombre: ['', Validators.required],
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadCentroCosto(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.centroCosto.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.centroCostoService.update(Number(id), payload)
      : this.centroCostoService.create(payload);

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

  private loadCentroCosto(id: number): void {
    this.centroCostoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => this.form.patchValue(centroCostoToFormValue(c)),
        error: () => {
          const toasts = this.t().entities.centroCosto.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...CENTRO_COSTO_LIST_PATH]);
  }
}
