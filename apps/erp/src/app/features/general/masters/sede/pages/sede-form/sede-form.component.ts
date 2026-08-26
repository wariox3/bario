import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FieldErrorComponent, FocusInvalidDirective, PageActionsComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ErpApiAutocompleteComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { masterNav } from '@erp/core/erp-modules';
import { SedeService } from '../../sede.service';
import { CENTRO_COSTO_SELECT_ENDPOINT, SEDE_SEGMENT } from '../../sede.constants';
import { formValueToPayload, sedeToFormValue } from '../../sede.mapper';

/**
 * Formulario de alta/edición de sede.
 *
 * Master del módulo General (camino B). La misma página cubre crear y editar:
 * sin `:id` → alta; con `:id` → edición (el id llega por
 * `withComponentInputBinding`). El centro de costo es un autocomplete buscable
 * (`<lib-api-autocomplete>`) contra `/contabilidad/centro-costo/seleccionar/`.
 */
@Component({
  selector: 'app-sede-form',
  standalone: true,
  imports: [
    FocusInvalidDirective,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    FieldErrorComponent,
    PageActionsComponent,
    ErpApiAutocompleteComponent,
  ],
  templateUrl: './sede-form.component.html',
  styleUrl: './sede-form.component.scss',
})
export class SedeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SedeService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  private readonly nav = masterNav(SEDE_SEGMENT);

  /** Id de la sede a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  protected readonly centroCostoEndpoint = CENTRO_COSTO_SELECT_ENDPOINT;

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() =>
    this.nav.crumbs(this.t().entities.sede.name, {
      label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new,
    }),
  );

  protected readonly form = this.fb.group({
    nombre: this.fb.control<string>('', [Validators.required, Validators.maxLength(100)]),
    centro_costo: this.fb.control<ErpSelectOption | null>(null),
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadSede(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.sede.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id ? this.service.update(Number(id), payload) : this.service.create(payload);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSaving.set(false);
        const ok = id ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(ok.title, ok.desc);
        this.nav.ir();
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        const fail = id ? toasts.editError : toasts.createError;
        this.formErrors.handle(this.form, err, fail.title);
      },
    });
  }

  protected onCancel(): void {
    this.nav.ir();
  }

  private loadSede(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => this.form.patchValue(sedeToFormValue(s)),
        error: () => {
          const toasts = this.t().entities.sede.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }
}
