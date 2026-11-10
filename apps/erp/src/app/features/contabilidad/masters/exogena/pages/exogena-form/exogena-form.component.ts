import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { FormErrorService, I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { FieldErrorComponent, FocusInvalidDirective, PageActionsComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { EXOGENA_LIST_PATH } from '../../exogena.constants';
import { ExogenaService } from '../../exogena.service';

/**
 * Alta y edición de la exógena de un año. Sin `:id` → alta; con `:id` → edición,
 * donde el año queda bloqueado porque el backend solo deja cambiar el comentario.
 */
@Component({
  selector: 'app-exogena-form',
  standalone: true,
  imports: [
    FocusInvalidDirective,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputNumberModule,
    TextareaModule,
    FieldErrorComponent,
    PageActionsComponent,
  ],
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './exogena-form.component.html',
})
export class ExogenaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ExogenaService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id de la exógena a editar (route param `:id`). Ausente en modo alta. */
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
        label: this.t().entities.exogena.name,
        routerLink: slug ? ['/t', slug, ...EXOGENA_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    anio: this.fb.control<number | null>(null, Validators.required),
    comentario: this.fb.control<string | null>(null, Validators.maxLength(500)),
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    this.form.controls.anio.disable();
    this.load(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.exogena.form.toasts;
    const id = this.id();
    const { anio, comentario } = this.form.getRawValue();
    // El backend exige mínimo un carácter: el comentario en blanco viaja como null.
    const comentarioLimpio = comentario?.trim() || null;
    const operation = id
      ? this.service.update(Number(id), { comentario: comentarioLimpio })
      : this.service.create({ anio: anio as number, comentario: comentarioLimpio });

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        const ok = id ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(ok.title, ok.desc);
        const savedId = id ? Number(id) : saved?.id;
        if (savedId == null) {
          this.navigateTo();
          return;
        }
        this.navigateTo('detalle', savedId);
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        const fail = id ? toasts.editError : toasts.createError;
        this.formErrors.handle(this.form, err, fail.title);
      },
    });
  }

  protected onCancel(): void {
    this.navigateTo();
  }

  private load(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (exogena) =>
          this.form.patchValue({ anio: exogena.anio, comentario: exogena.comentario }),
      });
  }

  private navigateTo(...subPath: (string | number)[]): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...EXOGENA_LIST_PATH, ...subPath]);
  }
}
