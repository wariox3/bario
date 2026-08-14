import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { FieldErrorComponent, PageActionsComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, ToastService, startOfToday } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { UppercaseDirective } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { ActiveModuleStore, masterNav } from '@erp/core/erp-modules';
import { ResolucionService } from '../../resolucion.service';
import { CONSECUTIVO_MAX, RESOLUCION_SEGMENT } from '../../resolucion.constants';
import type { ResolucionTipo } from '../../resolucion.model';
import { resolucionToFormValue, formValueToPayload } from '../../resolucion.mapper';
import {
  consecutivosOrdenValidator,
  rangoFechasValidator,
} from '../../validators/resolucion.validators';

/**
 * Formulario de alta/edición de resolución.
 *
 * Master compartido enrutado desde Venta y Compra. El `tipo` (venta/compra) se
 * deriva del módulo activo (`ActiveModuleStore`) y fija el flag del payload —
 * el usuario no lo edita. La misma página cubre crear y editar: sin `:id` →
 * alta (sugiere hoy en fecha_desde; deja fecha_hasta vacío); con `:id` →
 * edición.
 */
@Component({
  selector: 'app-resolucion-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DatePickerModule,
    FieldErrorComponent,
    PageActionsComponent,
    UppercaseDirective,
  ],
  templateUrl: './resolucion-form.component.html',
  styleUrl: './resolucion-form.component.scss',
})
export class ResolucionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly resolucionService = inject(ResolucionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  private readonly nav = masterNav(RESOLUCION_SEGMENT);

  /** Id de la resolución a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  /** Módulo activo (venta/compra) del que cuelga esta resolución. */
  protected readonly tipo = computed<ResolucionTipo>(() =>
    this.activeModule.activeId() === 'compra' ? 'compra' : 'venta',
  );

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() =>
    this.nav.crumbs(this.t().entities.resolucion.name, {
      label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new,
    }),
  );

  protected readonly form = this.fb.group(
    {
      prefijo: ['', [Validators.required, Validators.maxLength(10)]],
      numero: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      consecutivo_desde: [
        null as number | null,
        [Validators.required, Validators.min(0), Validators.max(CONSECUTIVO_MAX)],
      ],
      consecutivo_hasta: [
        null as number | null,
        [Validators.required, Validators.min(0), Validators.max(CONSECUTIVO_MAX)],
      ],
      fecha_desde: [null as Date | null, Validators.required],
      fecha_hasta: [null as Date | null, Validators.required],
    },
    { validators: [consecutivosOrdenValidator(), rangoFechasValidator()] },
  );

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.loadResolucion(Number(id));
    } else {
      // Solo sugerimos el inicio de vigencia; el vencimiento es una decisión
      // consciente (una resolución vigente "de hoy a hoy" no tiene sentido).
      this.form.patchValue({ fecha_desde: startOfToday() });
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.resolucion.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue(), this.tipo());
    const operation = id
      ? this.resolucionService.update(Number(id), payload)
      : this.resolucionService.create(payload);

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

  private loadResolucion(id: number): void {
    this.resolucionService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => this.form.patchValue(resolucionToFormValue(r)),
        error: () => {
          const toasts = this.t().entities.resolucion.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }
}
