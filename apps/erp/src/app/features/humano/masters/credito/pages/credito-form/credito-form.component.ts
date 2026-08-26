import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { FieldErrorComponent, FocusInvalidDirective, PageActionsComponent } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  TenantService,
  ToastService,
  startOfToday,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ErpApiAutocompleteComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { ContratoAutocompleteComponent, type ContratoOption } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { CreditoService } from '../../credito.service';
import { CONCEPTO_ENDPOINT, CREDITO_LIST_PATH } from '../../credito.constants';
import { creditoToFormValue, formValueToPayload } from '../../credito.mapper';

/**
 * Formulario de alta/edición de crédito de empleado.
 *
 * Master del módulo Humano (camino B). La misma página cubre crear y editar: sin
 * `:id` → alta (sugiere hoy en fecha_inicio); con `:id` → edición. `contrato` usa
 * `<lib-contrato-autocomplete>` y `concepto` usa `<lib-api-autocomplete>` (búsqueda
 * por `nombre__icontains`).
 */
@Component({
  selector: 'app-credito-form',
  standalone: true,
  imports: [
    FocusInvalidDirective,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputNumberModule,
    DatePickerModule,
    CheckboxModule,
    FieldErrorComponent,
    PageActionsComponent,
    ContratoAutocompleteComponent,
    ErpApiAutocompleteComponent,
  ],
  templateUrl: './credito-form.component.html',
  styleUrl: './credito-form.component.scss',
})
export class CreditoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly creditoService = inject(CreditoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly conceptoEndpoint = CONCEPTO_ENDPOINT;

  /** Id del crédito a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.credito.name,
        routerLink: slug ? ['/t', slug, ...CREDITO_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    contrato: this.fb.control<ContratoOption | null>(null, Validators.required),
    concepto: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    fecha_inicio: this.fb.control<Date | null>(null, Validators.required),
    total: this.fb.control<number | null>(null, Validators.required),
    cuota: this.fb.control<number | null>(null, Validators.required),
    cantidad_cuotas: this.fb.control<number | null>(null, Validators.required),
    inactivo: [false],
    aplica_prima: [false],
    aplica_cesantia: [false],
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.loadCredito(Number(id));
    } else {
      this.form.patchValue({ fecha_inicio: startOfToday() });
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.credito.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.creditoService.update(Number(id), payload)
      : this.creditoService.create(payload);

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

  private loadCredito(id: number): void {
    this.creditoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => this.form.patchValue(creditoToFormValue(c)),
        error: () => {
          const toasts = this.t().entities.credito.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...CREDITO_LIST_PATH]);
  }
}
