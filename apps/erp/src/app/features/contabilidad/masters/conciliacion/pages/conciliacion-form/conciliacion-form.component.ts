import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import {
  FieldErrorComponent,
  FocusInvalidDirective,
  MascaraFechaDirective,
  PageActionsComponent,
} from '@reddoc/ui';
import { ErpApiSelectComponent } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  TenantService,
  ToastService,
  startOfToday,
  type ErpSelectOption,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { CONCILIACION_LIST_PATH, CUENTA_BANCO_ENDPOINT } from '../../conciliacion.constants';
import { conciliacionToFormValue, formValueToPayload } from '../../conciliacion.mapper';
import type { Conciliacion } from '../../conciliacion.model';
import { ConciliacionService } from '../../conciliacion.service';
import { rangoFechasValido } from '../../conciliacion.validators';

/**
 * Alta/edición de la cabecera de una **conciliación bancaria**: cuenta bancaria
 * y periodo. El proceso (cargar, importar el extracto, conciliar) vive en la
 * ficha, que es adonde se cae al guardar.
 */
@Component({
  selector: 'app-conciliacion-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    DatePickerModule,
    MascaraFechaDirective,
    FieldErrorComponent,
    FocusInvalidDirective,
    PageActionsComponent,
    ErpApiSelectComponent,
  ],
  templateUrl: './conciliacion-form.component.html',
  styleUrl: './conciliacion-form.component.scss',
})
export class ConciliacionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ConciliacionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly cuentaBancoEndpoint = CUENTA_BANCO_ENDPOINT;

  /** Id del registro a editar (route param `:id`). Ausente en modo alta. */
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
        label: this.t().entities.conciliacion.name,
        routerLink: slug ? ['/t', slug, ...CONCILIACION_LIST_PATH] : undefined,
      },
      {
        label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new,
      },
    ];
  });

  protected readonly form = this.fb.group(
    {
      fecha_desde: this.fb.control<Date | null>(startOfToday(), Validators.required),
      fecha_hasta: this.fb.control<Date | null>(startOfToday(), Validators.required),
      cuenta_banco: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    },
    { validators: rangoFechasValido() },
  );

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadConciliacion(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;

    const id = this.id();
    const toasts = this.t().entities.conciliacion.form.toasts;
    const payload = formValueToPayload(this.form.getRawValue());

    this.isSaving.set(true);
    const operation = id ? this.service.update(Number(id), payload) : this.service.create(payload);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        const done = id ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(done.title, done.desc);
        // Se cae en la ficha: ahí se carga el detalle y el soporte.
        const savedId = id ? Number(id) : saved?.id;
        if (savedId != null) this.navigateTo('detalle', savedId);
        else this.navigateToList();
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

  private loadConciliacion(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (read: Conciliacion) =>
          this.form.patchValue(conciliacionToFormValue(read), { emitEvent: false }),
        error: () => {
          const toasts = this.t().entities.conciliacion.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    this.navigateTo();
  }

  private navigateTo(segment?: string, id?: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const commands: (string | number)[] = ['/t', slug, ...CONCILIACION_LIST_PATH];
    if (segment) commands.push(segment);
    if (id != null) commands.push(id);
    void this.router.navigate(commands);
  }
}
