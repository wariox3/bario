import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { FieldErrorComponent, FocusInvalidDirective, PageActionsComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { GrupoService } from '../../grupo.service';
import {
  GRUPO_LIST_PATH,
  GRUPO_PERIODO_MENSUAL,
  GRUPO_PERIODO_QUINCENAL,
} from '../../grupo.constants';
import { grupoToFormValue, formValueToPayload } from '../../grupo.mapper';

/**
 * Formulario de alta/edición de grupo.
 *
 * Master del módulo Humano (camino B). La misma página cubre crear y editar:
 * sin `:id` → alta; con `:id` → edición (el id llega por
 * `withComponentInputBinding`).
 */
@Component({
  selector: 'app-grupo-form',
  standalone: true,
  imports: [
    FocusInvalidDirective,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    SelectModule,
    FieldErrorComponent,
    PageActionsComponent,
  ],
  templateUrl: './grupo-form.component.html',
  styleUrl: './grupo-form.component.scss',
})
export class GrupoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly grupoService = inject(GrupoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del grupo a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  /** Opciones del selector de período con label traducido. */
  protected readonly periodoOptions = computed(() => {
    const periodos = this.t().entities.grupo.periodos;
    return [
      { label: periodos[GRUPO_PERIODO_QUINCENAL], value: GRUPO_PERIODO_QUINCENAL },
      { label: periodos[GRUPO_PERIODO_MENSUAL], value: GRUPO_PERIODO_MENSUAL },
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
        label: this.t().entities.grupo.name,
        routerLink: slug ? ['/t', slug, ...GRUPO_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
    periodo: this.fb.control<number | null>(null, Validators.required),
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadGrupo(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.grupo.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.grupoService.update(Number(id), payload)
      : this.grupoService.create(payload);

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

  private loadGrupo(id: number): void {
    this.grupoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (g) => this.form.patchValue(grupoToFormValue(g)),
        error: () => {
          const toasts = this.t().entities.grupo.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...GRUPO_LIST_PATH]);
  }
}
