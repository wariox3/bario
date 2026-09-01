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
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FormErrorService, I18nService, ToastService, type ErpSelectOption } from '@reddoc/core';
import {
  ContratoAutocompleteComponent,
  ErpApiAutocompleteComponent,
  FieldErrorComponent,
} from '@reddoc/ui';
import { AdicionalService } from '@erp/features/humano/masters/adicional/adicional.service';
import type { Adicional } from '@erp/features/humano/masters/adicional/adicional.model';
import type { AppDict } from '@erp/i18n';
import {
  CONCEPTO_ADICIONAL_ENDPOINT,
  CONCEPTO_ADICIONAL_PARAMS,
} from '../../programacion.constants';
import type { AdicionalProgramacionPayload } from '../../programacion.model';

/** Datos con los que la pestaña abre el modal. `adicional: null` → alta. */
export interface AdicionalModalData {
  readonly programacionId: number;
  readonly adicional: Adicional | null;
}

/**
 * Alta y edición de un **concepto adicional** dentro de la programación.
 *
 * Reusa `AdicionalService` del master: el transporte es el mismo endpoint. Lo que
 * cambia es el payload — acá el adicional nace **atado a la programación**, y se
 * pueden capturar `horas` (el master no las expone porque las gestiona este
 * proceso).
 *
 * Cierra con `true` si guardó.
 */
@Component({
  selector: 'app-adicional-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    FieldErrorComponent,
    ContratoAutocompleteComponent,
    ErpApiAutocompleteComponent,
  ],
  templateUrl: './adicional-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdicionalModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AdicionalService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig<AdicionalModalData>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly conceptoEndpoint = CONCEPTO_ADICIONAL_ENDPOINT;
  protected readonly conceptoParams = CONCEPTO_ADICIONAL_PARAMS;

  private readonly data = this.config.data as AdicionalModalData;

  protected readonly isEditMode = computed(() => this.data.adicional !== null);
  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    contrato: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    concepto: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    valor: this.fb.control<number | null>(0, [Validators.required, Validators.min(0)]),
    horas: this.fb.control<number>(0, { nonNullable: true }),
    detalle: this.fb.control<string | null>(null, Validators.maxLength(200)),
    aplica_dia_laborado: this.fb.control<boolean>(false, { nonNullable: true }),
  });

  constructor() {
    const adicional = this.data.adicional;
    if (adicional) {
      this.form.patchValue(
        {
          contrato:
            adicional.contrato != null
              ? { id: adicional.contrato, nombre: adicional.contrato_nombre ?? '' }
              : null,
          concepto:
            adicional.concepto != null
              ? { id: adicional.concepto, nombre: adicional.concepto_nombre ?? '' }
              : null,
          valor: toNumero(adicional.valor),
          // `horas` llega como string Decimal (`"0.000"`), igual que `valor`.
          horas: toNumero(adicional.horas),
          detalle: adicional.detalle,
          aplica_dia_laborado: adicional.aplica_dia_laborado,
        },
        { emitEvent: false },
      );
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const raw = this.form.getRawValue();
    const payload: AdicionalProgramacionPayload = {
      contrato: raw.contrato?.id ?? null,
      concepto: raw.concepto?.id ?? null,
      valor: raw.valor,
      horas: raw.horas,
      detalle: raw.detalle,
      aplica_dia_laborado: raw.aplica_dia_laborado,
      inactivo: false,
      programacion: this.data.programacionId,
    };

    const toasts = this.t().entities.programacion.adicionales.toasts;
    const adicional = this.data.adicional;
    const operacion = adicional
      ? this.service.update(adicional.id, payload)
      : this.service.create(payload);

    operacion
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false)),
      )
      .subscribe({
        next: () => {
          const ok = adicional ? toasts.editSuccess : toasts.createSuccess;
          this.toast.success(ok.title, ok.desc);
          this.ref.close(true);
        },
        error: (err: unknown) => {
          const fail = adicional ? toasts.editError : toasts.createError;
          this.formErrors.handle(this.form, err, fail.title);
        },
      });
  }

  protected onCancel(): void {
    this.ref.close(false);
  }
}

/** El valor llega como string decimal del backend. */
function toNumero(valor: string | number | null): number {
  if (typeof valor === 'number') return valor;
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}
