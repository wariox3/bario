import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ErpApiSelectComponent, FieldErrorComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, ToastService, type ErpSelectOption } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import {
  CONCEPTO_ADICIONAL_ENDPOINT,
  CONCEPTO_ADICIONAL_PARAMS,
} from '../../liquidacion.constants';
import { OPERACION, montosDe, valorDe, type Operacion } from '../../liquidacion.adicionales';
import { LiquidacionService } from '../../liquidacion.service';

/** Datos con los que la pestaña abre el modal. */
export interface AdicionalModalData {
  readonly liquidacionId: number;
  /** Qué se está cargando: acota el catálogo y decide a qué campo va el valor. */
  readonly operacion: Operacion;
  /** Id del registro a editar; ausente al crear. */
  readonly adicionalId?: number;
}

/**
 * Alta y edición de un **adicional**: un concepto que suma o resta al total de la
 * liquidación.
 *
 * La operación llega decidida desde la pestaña (dos botones, "Adición" y
 * "Deducción") y no se cambia acá: es lo que filtra el catálogo de conceptos, así
 * que cambiarla a mitad dejaría elegido un concepto que ya no corresponde.
 *
 * El registro guarda **los dos** campos, `adicional` y `deduccion`, con uno en
 * cero; el reparto lo hace `montosDe` (ver `liquidacion.adicionales.ts`). El ERP
 * anterior lo resolvía con un `valueChanges` que patcheaba los dos campos del
 * formulario en cada tecla.
 *
 * **La edición no existe en el ERP anterior**: su modal solo crea, aunque el
 * servicio tenga el endpoint. Corregir un valor mal tecleado obligaba a borrar y
 * volver a cargarlo.
 */
@Component({
  selector: 'app-adicional-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    FieldErrorComponent,
    ErpApiSelectComponent,
  ],
  templateUrl: './adicional-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdicionalModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(LiquidacionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject<DynamicDialogConfig<AdicionalModalData>>(DynamicDialogConfig);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly conceptoEndpoint = CONCEPTO_ADICIONAL_ENDPOINT;

  protected readonly datos = this.config.data as AdicionalModalData;

  protected readonly isEditMode = this.datos.adicionalId != null;
  protected readonly isLoading = signal(this.isEditMode);
  protected readonly isSaving = signal(false);

  protected readonly esDeduccion = this.datos.operacion === OPERACION.DEDUCE;

  /** El catálogo se acota a los conceptos de la operación que se está cargando. */
  protected readonly conceptoParams = {
    ...CONCEPTO_ADICIONAL_PARAMS,
    operacion: this.datos.operacion,
  };

  protected readonly form = this.fb.group({
    concepto: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    valor: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    detalle: this.fb.control<string | null>(null, Validators.maxLength(150)),
  });

  protected readonly titulo = computed(() => {
    const m = this.t().entities.liquidacion.adicionales;
    if (this.isEditMode) return m.editTitle;
    return this.esDeduccion ? m.createDeduccionTitle : m.createAdicionTitle;
  });

  constructor() {
    const id = this.datos.adicionalId;
    if (id != null) this.cargar(id);
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const toasts = this.t().entities.liquidacion.adicionales.toasts;
    const payload = {
      liquidacion: this.datos.liquidacionId,
      concepto: raw.concepto?.id ?? null,
      detalle: raw.detalle,
      ...montosDe(this.datos.operacion, raw.valor),
    };

    const id = this.datos.adicionalId;
    this.isSaving.set(true);
    const operacion =
      id != null
        ? this.service.actualizarAdicional(id, payload)
        : this.service.crearAdicional(payload);

    operacion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSaving.set(false);
        const ok = id != null ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(ok.title, ok.desc);
        this.ref.close(true);
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        const fail = id != null ? toasts.editError : toasts.createError;
        this.formErrors.handle(this.form, err, fail.title);
      },
    });
  }

  protected onCancel(): void {
    this.ref.close();
  }

  /**
   * Carga el registro a editar.
   *
   * El campo "valor" no existe en el backend: se reconstruye del par
   * `adicional`/`deduccion` con `valorDe`.
   */
  private cargar(id: number): void {
    this.service
      .obtenerAdicional(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (read) => {
          this.form.patchValue({
            concepto:
              read.concepto != null
                ? { id: read.concepto, nombre: read.concepto__nombre ?? '' }
                : null,
            valor: valorDe(read),
            detalle: read.detalle,
          });
        },
        error: () => {
          const toasts = this.t().entities.liquidacion.adicionales.toasts.loadError;
          this.toast.error(toasts.title, toasts.desc);
          this.ref.close();
        },
      });
  }
}
