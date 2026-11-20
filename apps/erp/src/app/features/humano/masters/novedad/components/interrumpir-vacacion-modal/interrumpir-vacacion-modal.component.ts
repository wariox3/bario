import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
  type ValidatorFn,
} from '@angular/forms';
import { merge } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { FieldErrorComponent, FocusInvalidDirective, MascaraFechaDirective } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  formatFechaCorta,
  fromIsoDate,
  toIsoDate,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { NovedadService } from '../../novedad.service';
import type { Novedad } from '../../novedad.model';
import { dateRangeValidator } from '../../utils/date-range.validator';

/** Datos con los que la ficha abre el modal: la vacación tal como está hoy. */
export interface InterrumpirVacacionModalData {
  readonly novedad: Novedad;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Días calendario entre dos fechas, extremos incluidos. `round` absorbe el cambio de horario. */
function diasEntre(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / DIA_MS) + 1;
}

function aNumero(valor: string | number | null | undefined): number | null {
  if (valor == null || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** Interrumpir es acortar: con las mismas fechas no hay interrupción (el backend lo rechaza). */
function cambiaFechas(desdeOriginal: string | null, hastaOriginal: string | null): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const desde = group.get('fecha_desde')?.value as Date | null;
    const hasta = group.get('fecha_hasta')?.value as Date | null;
    if (!desde || !hasta) return null;
    return toIsoDate(desde) === desdeOriginal && toIsoDate(hasta) === hastaOriginal
      ? { mismasFechas: true }
      : null;
  };
}

/** Los días reales no pueden pasar de los días calendario del rango nuevo. */
function realesDentroDelRango(group: AbstractControl): ValidationErrors | null {
  const desde = group.get('fecha_desde')?.value as Date | null;
  const hasta = group.get('fecha_hasta')?.value as Date | null;
  const reales = group.get('dias_disfrutados_reales')?.value as number | null;
  if (!desde || !hasta || reales == null || desde > hasta) return null;
  return reales > diasEntre(desde, hasta) ? { realesExcedenRango: true } : null;
}

/**
 * Interrumpe una vacación por una incapacidad: se deja con las fechas y los días
 * que alcanzó a disfrutar. El backend no prorratea, así que los cuatro valores
 * llegan finales. Los hábiles que deja de tomar vuelven como pendientes para la
 * reanudación.
 *
 * El rango nuevo cabe en el original (el calendario no deja salir) y los días
 * reales siguen al rango mientras se eligen las fechas: es el valor natural,
 * y sigue editable. Lo que solo sabe el backend (última aprobada del contrato,
 * días ya pagados fuera del rango) llega como `detail` en un toast.
 *
 * Cierra con la respuesta del backend; sin ella (Cancelar, Esc, máscara), con `null`.
 */
@Component({
  selector: 'app-interrumpir-vacacion-modal',
  standalone: true,
  imports: [
    FocusInvalidDirective,
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    InputNumberModule,
    MascaraFechaDirective,
    FieldErrorComponent,
  ],
  templateUrl: './interrumpir-vacacion-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterrumpirVacacionModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(NovedadService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref = inject(DynamicDialogRef);
  private readonly config =
    inject<DynamicDialogConfig<InterrumpirVacacionModalData>>(DynamicDialogConfig);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly novedad = (this.config.data as InterrumpirVacacionModalData).novedad;

  protected readonly minFecha = fromIsoDate(this.novedad.fecha_desde);
  protected readonly maxFecha = fromIsoDate(this.novedad.fecha_hasta);
  /** Tope de los hábiles: no se disfrutan más de los que tenía la vacación. */
  protected readonly maxDiasDisfrutados = aNumero(this.novedad.dias_disfrutados) ?? 0;

  /** «05/01/2026 – 11/01/2026», la vacación original, en el subtítulo. */
  protected readonly rangoOriginal = `${formatFechaCorta(this.novedad.fecha_desde)} – ${formatFechaCorta(this.novedad.fecha_hasta)}`;

  protected readonly maxDisfrutadosMsg = computed(() =>
    this.t().entities.novedad.interrumpir.validation.maxDisfrutados.replace(
      '{n}',
      String(this.maxDiasDisfrutados),
    ),
  );

  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group(
    {
      fecha_desde: this.fb.control<Date | null>(this.minFecha, Validators.required),
      fecha_hasta: this.fb.control<Date | null>(this.maxFecha, Validators.required),
      dias_disfrutados: this.fb.control<number | null>(this.maxDiasDisfrutados || null, [
        Validators.required,
        Validators.min(1),
        Validators.max(this.maxDiasDisfrutados),
      ]),
      dias_disfrutados_reales: this.fb.control<number | null>(
        aNumero(this.novedad.dias_disfrutados_reales),
        [Validators.required, Validators.min(1)],
      ),
    },
    {
      validators: [
        dateRangeValidator('fecha_desde', 'fecha_hasta'),
        cambiaFechas(this.novedad.fecha_desde, this.novedad.fecha_hasta),
        realesDentroDelRango,
      ],
    },
  );

  constructor() {
    const { fecha_desde, fecha_hasta, dias_disfrutados_reales } = this.form.controls;
    merge(fecha_desde.valueChanges, fecha_hasta.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const desde = fecha_desde.value;
        const hasta = fecha_hasta.value;
        if (desde && hasta && desde <= hasta) {
          dias_disfrutados_reales.setValue(diasEntre(desde, hasta));
        }
      });
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;

    const raw = this.form.getRawValue();
    if (!raw.fecha_desde || !raw.fecha_hasta) return;

    this.isSaving.set(true);
    this.service
      .interrumpir({
        id: this.novedad.id,
        fecha_desde: toIsoDate(raw.fecha_desde),
        fecha_hasta: toIsoDate(raw.fecha_hasta),
        dias_disfrutados: raw.dias_disfrutados ?? 0,
        dias_disfrutados_reales: raw.dias_disfrutados_reales ?? 0,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.isSaving.set(false);
          this.ref.close(respuesta);
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.formErrors.handle(
            this.form,
            err,
            this.t().entities.novedad.interrumpir.toasts.error.title,
          );
        },
      });
  }

  protected onClose(): void {
    this.ref.close(null);
  }
}
