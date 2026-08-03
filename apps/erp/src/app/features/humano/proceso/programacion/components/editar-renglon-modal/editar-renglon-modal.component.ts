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
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { I18nService, ToastService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { PAGO_TIPO_ID, type ProgramacionDetalle } from '../../programacion.model';
import { ProgramacionService } from '../../programacion.service';

/** Datos con los que el workspace abre el modal. */
export interface EditarRenglonModalData {
  readonly renglonId: number;
  readonly pagoTipoId: number | null;
}

/**
 * Las 11 clases de hora y recargo, en el orden en que se editan. Se declaran una
 * vez y las usan el `FormGroup`, el `patchValue` y la plantilla.
 */
const CAMPOS_HORA = [
  'diurna',
  'nocturna',
  'festiva_diurna',
  'festiva_nocturna',
  'extra_diurna',
  'extra_nocturna',
  'extra_festiva_diurna',
  'extra_festiva_nocturna',
  'recargo_nocturno',
  'recargo_festivo_diurno',
  'recargo_festivo_nocturno',
] as const;

/** Las 12 banderas que se pueden apagar para un empleado concreto. */
const CAMPOS_BANDERA = [
  'pago_horas',
  'pago_auxilio_transporte',
  'pago_incapacidad',
  'pago_licencia',
  'pago_vacacion',
  'descuento_salud',
  'descuento_pension',
  'descuento_fondo_solidaridad',
  'descuento_retencion_fuente',
  'descuento_credito',
  'descuento_embargo',
  'adicional',
] as const;

/**
 * Ajuste manual de un **renglón** antes de liquidar: sus horas, sus días de
 * transporte y qué conceptos aplican para ese empleado.
 *
 * Un solo modal para los cuatro tipos de pago, con el bloque del medio
 * condicionado: la nómina del periodo edita horas; prima, cesantía e interés
 * editan las bases (salario y promedio) más el valor propuesto de la prestación.
 * El ERP anterior tenía dos modales con el mismo formulario duplicado.
 *
 * Cierra con `true` si guardó, para que el llamador recargue.
 */
@Component({
  selector: 'app-editar-renglon-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, CheckboxModule, InputNumberModule],
  templateUrl: './editar-renglon-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditarRenglonModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProgramacionService);
  private readonly toast = inject(ToastService);
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig<EditarRenglonModalData>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly camposHora = CAMPOS_HORA;
  protected readonly camposBandera = CAMPOS_BANDERA;

  private readonly data = this.config.data as EditarRenglonModalData;

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  /** Empleado del renglón, para que el modal diga a quién se está ajustando. */
  protected readonly empleado = signal<string>('');

  /** La nómina del periodo edita horas; el resto, bases y prestación propuesta. */
  protected readonly editaHoras = computed(() => this.data.pagoTipoId === PAGO_TIPO_ID.NOMINA);

  /** Cesantía e interés piden además el valor propuesto de la prestación. */
  protected readonly campoPropuesto = computed<'cesantia_propuesto' | 'interes_propuesto' | null>(
    () => {
      if (this.data.pagoTipoId === PAGO_TIPO_ID.CESANTIA) return 'cesantia_propuesto';
      if (this.data.pagoTipoId === PAGO_TIPO_ID.INTERES_CESANTIA) return 'interes_propuesto';
      return null;
    },
  );

  protected readonly form = this.fb.group({
    dias_transporte: this.fb.control<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    // Bases: solo se editan en prima, cesantía e interés, pero viven siempre en el
    // grupo para que el payload tenga una sola forma.
    salario: this.fb.control<number>(0, { nonNullable: true }),
    salario_promedio: this.fb.control<number>(0, { nonNullable: true }),
    cesantia_propuesto: this.fb.control<number>(0, { nonNullable: true }),
    interes_propuesto: this.fb.control<number>(0, { nonNullable: true }),

    diurna: this.fb.control<number>(0, { nonNullable: true }),
    nocturna: this.fb.control<number>(0, { nonNullable: true }),
    festiva_diurna: this.fb.control<number>(0, { nonNullable: true }),
    festiva_nocturna: this.fb.control<number>(0, { nonNullable: true }),
    extra_diurna: this.fb.control<number>(0, { nonNullable: true }),
    extra_nocturna: this.fb.control<number>(0, { nonNullable: true }),
    extra_festiva_diurna: this.fb.control<number>(0, { nonNullable: true }),
    extra_festiva_nocturna: this.fb.control<number>(0, { nonNullable: true }),
    recargo_nocturno: this.fb.control<number>(0, { nonNullable: true }),
    recargo_festivo_diurno: this.fb.control<number>(0, { nonNullable: true }),
    recargo_festivo_nocturno: this.fb.control<number>(0, { nonNullable: true }),

    pago_horas: this.fb.control<boolean>(false, { nonNullable: true }),
    pago_auxilio_transporte: this.fb.control<boolean>(false, { nonNullable: true }),
    pago_incapacidad: this.fb.control<boolean>(false, { nonNullable: true }),
    pago_licencia: this.fb.control<boolean>(false, { nonNullable: true }),
    pago_vacacion: this.fb.control<boolean>(false, { nonNullable: true }),
    descuento_salud: this.fb.control<boolean>(false, { nonNullable: true }),
    descuento_pension: this.fb.control<boolean>(false, { nonNullable: true }),
    descuento_fondo_solidaridad: this.fb.control<boolean>(false, { nonNullable: true }),
    descuento_retencion_fuente: this.fb.control<boolean>(false, { nonNullable: true }),
    descuento_credito: this.fb.control<boolean>(false, { nonNullable: true }),
    descuento_embargo: this.fb.control<boolean>(false, { nonNullable: true }),
    adicional: this.fb.control<boolean>(false, { nonNullable: true }),
  });

  constructor() {
    this.cargar();
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.programacion.editarRenglon.toasts;
    this.service
      .actualizarRenglon(this.data.renglonId, this.payload())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(toasts.success.title, toasts.success.desc);
          this.ref.close(true);
        },
        error: () => this.toast.error(toasts.error.title, toasts.error.desc),
      });
  }

  protected onCancel(): void {
    this.ref.close(false);
  }

  /** Etiqueta i18n de un campo de hora o bandera (se renderizan en bucle). */
  protected etiqueta(grupo: 'horas' | 'banderas', campo: string): string {
    return this.i18n.translate(`entities.programacion.editarRenglon.${grupo}.${campo}`);
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /**
   * Solo se manda lo que el tipo de pago edita: enviar horas en una liquidación de
   * cesantías, o bases en una nómina, sería mandar ceros sobre datos que el
   * backend ya calculó.
   */
  private payload(): Record<string, number | boolean> {
    const raw = this.form.getRawValue();
    const payload: Record<string, number | boolean> = {
      dias_transporte: raw.dias_transporte,
    };

    for (const bandera of CAMPOS_BANDERA) payload[bandera] = raw[bandera];

    if (this.editaHoras()) {
      for (const campo of CAMPOS_HORA) payload[campo] = raw[campo];
    } else {
      payload['salario'] = raw.salario;
      payload['salario_promedio'] = raw.salario_promedio;
      const propuesto = this.campoPropuesto();
      if (propuesto) payload[propuesto] = raw[propuesto];
    }

    return payload;
  }

  private cargar(): void {
    this.service
      .obtenerRenglon(this.data.renglonId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (renglon) => this.aplicar(renglon),
        error: () => {
          const toasts = this.t().entities.programacion.editarRenglon.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
          this.ref.close(false);
        },
      });
  }

  private aplicar(renglon: ProgramacionDetalle): void {
    this.empleado.set(
      [renglon.contrato_contacto_numero_identificacion, renglon.contrato_contacto_nombre_corto]
        .filter(Boolean)
        .join(' · '),
    );

    const valores: Record<string, number | boolean> = {
      dias_transporte: renglon.dias_transporte ?? 0,
      salario: numero(renglon.salario),
      salario_promedio: numero(renglon.salario_promedio),
    };
    for (const campo of CAMPOS_HORA) valores[campo] = renglon[campo] ?? 0;
    for (const bandera of CAMPOS_BANDERA) valores[bandera] = renglon[bandera];

    this.form.patchValue(valores, { emitEvent: false });
  }
}

/** Los montos llegan como string decimal del backend. */
function numero(valor: string | number | null): number {
  if (typeof valor === 'number') return valor;
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}
