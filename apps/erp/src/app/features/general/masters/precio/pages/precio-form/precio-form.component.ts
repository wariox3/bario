import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { FieldErrorComponent } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  TenantService,
  ToastService,
  startOfToday,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { PrecioService } from '../../precio.service';
import { PRECIO_LIST_PATH } from '../../precio.constants';
import { precioToFormValue, formValueToPayload } from '../../precio.mapper';

/**
 * Formulario de alta/edición de lista de precios.
 *
 * Master del módulo General (camino B). La misma página cubre crear y editar:
 * sin `:id` → alta; con `:id` → edición (el id llega por
 * `withComponentInputBinding`).
 */
@Component({
  selector: 'app-precio-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    DatePickerModule,
    CheckboxModule,
    FieldErrorComponent,
  ],
  templateUrl: './precio-form.component.html',
  styleUrl: './precio-form.component.scss',
})
export class PrecioFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly precioService = inject(PrecioService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id de la lista de precios a editar (route param `:id`). Ausente en modo alta. */
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
        label: this.t().entities.precio.name,
        routerLink: slug ? ['/t', slug, moduleId, ...PRECIO_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
    venta: [false],
    compra: [false],
    fecha_vence: [startOfToday() as Date | null, Validators.required],
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadPrecio(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.precio.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.precioService.update(Number(id), payload)
      : this.precioService.create(payload);

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

  private loadPrecio(id: number): void {
    this.precioService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => this.form.patchValue(precioToFormValue(p)),
        error: () => {
          const toasts = this.t().entities.precio.form.toasts;
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
      ...PRECIO_LIST_PATH,
    ]);
  }
}
