import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { FieldErrorComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ErpApiAutocompleteComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { ContratoAutocompleteComponent, type ContratoOption } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { AdicionalService } from '../../adicional.service';
import { CONCEPTO_ENDPOINT, ADICIONAL_LIST_PATH } from '../../adicional.constants';
import { adicionalToFormValue, formValueToPayload } from '../../adicional.mapper';

/**
 * Formulario de alta/edición de adicional de empleado.
 *
 * Master del módulo Humano (camino B). La misma página cubre crear y editar: sin
 * `:id` → alta; con `:id` → edición. `contrato` usa `<lib-contrato-autocomplete>`
 * y `concepto` usa `<lib-api-autocomplete>` (búsqueda por `nombre__icontains`).
 */
@Component({
  selector: 'app-adicional-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputNumberModule,
    TextareaModule,
    CheckboxModule,
    FieldErrorComponent,
    ContratoAutocompleteComponent,
    ErpApiAutocompleteComponent,
  ],
  templateUrl: './adicional-form.component.html',
  styleUrl: './adicional-form.component.scss',
})
export class AdicionalFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adicionalService = inject(AdicionalService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly conceptoEndpoint = CONCEPTO_ENDPOINT;

  /** Id del adicional a editar (route param `:id`). Ausente en modo alta. */
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
        label: this.t().entities.adicional.name,
        routerLink: slug ? ['/t', slug, ...ADICIONAL_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    contrato: this.fb.control<ContratoOption | null>(null, Validators.required),
    concepto: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    valor: this.fb.control<number | null>(null, Validators.required),
    detalle: [''],
    aplica_dia_laborado: [false],
    inactivo: [false],
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadAdicional(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.adicional.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.adicionalService.update(Number(id), payload)
      : this.adicionalService.create(payload);

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

  private loadAdicional(id: number): void {
    this.adicionalService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (a) => this.form.patchValue(adicionalToFormValue(a)),
        error: () => {
          const toasts = this.t().entities.adicional.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...ADICIONAL_LIST_PATH]);
  }
}
