import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FieldErrorComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { AlmacenService } from '../../almacen.service';
import { ALMACEN_LIST_PATH } from '../../almacen.constants';

/** Tope de caracteres del nombre, tomado del ERP anterior. */
const NOMBRE_MAX_LENGTH = 80;

/**
 * Formulario de alta/edición de almacén.
 *
 * Master del módulo Inventario (camino B). La misma página cubre crear y
 * editar: sin `:id` → alta; con `:id` → edición (el id llega por
 * `withComponentInputBinding`).
 *
 * Un solo control, así que no hay mapper ni tipo de form value: el payload sale
 * derecho del `getRawValue()`.
 */
@Component({
  selector: 'app-almacen-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    FieldErrorComponent,
  ],
  templateUrl: './almacen-form.component.html',
  styleUrl: './almacen-form.component.scss',
})
export class AlmacenFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AlmacenService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del almacén a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);
  protected readonly nombreMaxLength = NOMBRE_MAX_LENGTH;

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.inventario.name,
        routerLink: slug ? ['/t', slug, 'inventario'] : undefined,
      },
      {
        label: this.t().entities.almacen.name,
        routerLink: slug ? ['/t', slug, ...ALMACEN_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(NOMBRE_MAX_LENGTH)]],
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadAlmacen(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.almacen.form.toasts;
    const id = this.id();
    const payload = { nombre: this.form.getRawValue().nombre ?? '' };
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

  private loadAlmacen(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (a) => this.form.patchValue({ nombre: a.nombre }),
        error: () => {
          const toasts = this.t().entities.almacen.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...ALMACEN_LIST_PATH]);
  }
}
