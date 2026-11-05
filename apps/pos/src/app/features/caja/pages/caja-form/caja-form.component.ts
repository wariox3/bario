import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import {
  FormErrorService,
  I18nService,
  SELECT_ENDPOINTS,
  ToastService,
  type ErpSelectOption,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import {
  ErpApiSelectComponent,
  FieldErrorComponent,
  FocusInvalidDirective,
  PageActionsComponent,
} from '@reddoc/ui';
import type { AppDict } from '@pos/i18n';
import { cajaFormToPayload, cajaToFormValue } from '../../caja.mapper';
import { cajaNav } from '../../caja.nav';
import { CajaService } from '../../caja.service';

/**
 * Alta y edición de caja. La misma página cubre las dos: sin `:id` es alta y
 * con `:id` edición (el id llega por `withComponentInputBinding`). Guardar
 * termina en la ficha, para revisar lo que quedó almacenado.
 */
@Component({
  selector: 'app-caja-form',
  standalone: true,
  host: { class: 'flex flex-col gap-6' },
  imports: [
    ReactiveFormsModule,
    FocusInvalidDirective,
    BreadcrumbComponent,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    FieldErrorComponent,
    PageActionsComponent,
    ErpApiSelectComponent,
  ],
  templateUrl: './caja-form.component.html',
})
export class CajaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CajaService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly nav = cajaNav();

  protected readonly t = this.i18n.t;

  /** Id de la caja a editar (route param `:id`). Ausente en alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);
  protected readonly sedeEndpoint = SELECT_ENDPOINTS.sede;

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() =>
    this.nav.crumbs(this.t().layout.nav.caja, {
      label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new,
    }),
  );

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    sede: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    placa: ['', Validators.maxLength(50)],
    tipo: ['', Validators.maxLength(100)],
    ubicacion: ['', Validators.maxLength(255)],
    estado_activo: [true],
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) this.cargar(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().cajas.form.toasts;
    const id = this.id();
    const payload = cajaFormToPayload(this.form.getRawValue());
    const operacion = id ? this.service.update(Number(id), payload) : this.service.create(payload);

    operacion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (guardada) => {
        this.isSaving.set(false);
        const ok = id ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(ok.title, ok.desc);
        // En alta el id sale de la respuesta; si no viniera, se cae a la lista.
        const guardadaId = id ? Number(id) : guardada?.id;
        if (guardadaId == null) this.nav.ir();
        else this.nav.ir('detalle', guardadaId);
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        const fallo = id ? toasts.editError : toasts.createError;
        this.formErrors.handle(this.form, err, fallo.title);
      },
    });
  }

  protected onCancel(): void {
    this.nav.ir();
  }

  private cargar(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (caja) => this.form.patchValue(cajaToFormValue(caja)),
        error: () => {
          const tx = this.t().cajas.form.toasts.loadError;
          this.toast.error(tx.title, tx.desc);
        },
      });
  }
}
