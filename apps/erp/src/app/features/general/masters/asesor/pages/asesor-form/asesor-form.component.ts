import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FieldErrorComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { AsesorService } from '../../asesor.service';
import { ASESOR_LIST_PATH } from '../../asesor.constants';
import { asesorToFormValue, formValueToPayload } from '../../asesor.mapper';

/**
 * Formulario de alta/edición de asesor.
 *
 * Master del módulo General (camino B). La misma página cubre crear y editar:
 * sin `:id` → alta; con `:id` → edición (el id llega por
 * `withComponentInputBinding`).
 */
@Component({
  selector: 'app-asesor-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    FieldErrorComponent,
  ],
  templateUrl: './asesor-form.component.html',
  styleUrl: './asesor-form.component.scss',
})
export class AsesorFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly asesorService = inject(AsesorService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del asesor a editar (route param `:id`). Ausente en modo alta. */
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
        label: this.t().entities.asesor.name,
        routerLink: slug ? ['/t', slug, moduleId, ...ASESOR_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    nombre_corto: ['', Validators.required],
    celular: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadAsesor(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.asesor.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.asesorService.update(Number(id), payload)
      : this.asesorService.create(payload);

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

  private loadAsesor(id: number): void {
    this.asesorService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (a) => this.form.patchValue(asesorToFormValue(a)),
        error: () => {
          const toasts = this.t().entities.asesor.form.toasts;
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
      ...ASESOR_LIST_PATH,
    ]);
  }
}
