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
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import {
  ErpApiSelectComponent,
  FieldErrorComponent,
  FocusInvalidDirective,
  MascaraFechaDirective,
} from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  formatCop,
  formatFechaCorta,
  fromIsoDate,
  toIsoDate,
  type ErpSelectOption,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { Liquidacion } from '@erp/features/humano/proceso/liquidacion/liquidacion.model';
import { ContratoService } from '../../contrato.service';

/** Datos con los que la ficha abre el modal. */
export interface TerminarContratoModalData {
  readonly contratoId: number;
  readonly empleado: string | null;
  /** Inicio del contrato: la terminación no puede caer antes. */
  readonly fechaDesde: string | null;
  /** Fin previsto del contrato: siembra la fecha de terminación. */
  readonly fechaHasta: string | null;
}

/** Las prestaciones del resumen de éxito, con su clave en `liquidacion.prestaciones`. */
const PRESTACION_KEYS = ['cesantia', 'interes', 'prima', 'vacacion'] as const;

/** Catálogo de motivos. Ya lo usa el formulario del contrato. */
const MOTIVO_TERMINACION_ENDPOINT = '/humano/motivo-terminacion/seleccionar/';

/** La terminación no puede ser anterior al inicio del contrato. */
function noAntesDe(min: Date | null): ValidatorFn {
  return (control: AbstractControl<Date | null>): ValidationErrors | null => {
    const value = control.value;
    if (!min || !value) return null;
    return value < min ? { antesDelInicio: true } : null;
  };
}

/**
 * Termina un contrato: fecha y motivo.
 *
 * **No es un cambio de estado cualquiera.** Al terminar, el backend cierra el
 * contrato y **fabrica la liquidación** del empleado — cesantías, prima,
 * vacaciones e intereses. De ahí salen todas las liquidaciones del ERP: no se
 * crean desde su propia pantalla.
 *
 * El backend responde la liquidación ya calculada: el modal pasa a resumirla en
 * vez de cerrarse con un toast, para que se vea qué se liquidó.
 *
 * Cierra sin resultado: la ficha se recarga siempre al volver, porque también se
 * cierra con un click en la máscara o con Esc, y para entonces el contrato puede
 * estar terminado igual.
 */
@Component({
  selector: 'app-terminar-contrato-modal',
  standalone: true,
  imports: [
    FocusInvalidDirective,
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    MascaraFechaDirective,
    FieldErrorComponent,
    ErpApiSelectComponent,
  ],
  templateUrl: './terminar-contrato-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminarContratoModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ContratoService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref = inject(DynamicDialogRef);
  private readonly config =
    inject<DynamicDialogConfig<TerminarContratoModalData>>(DynamicDialogConfig);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly motivoEndpoint = MOTIVO_TERMINACION_ENDPOINT;
  protected readonly prestacionKeys = PRESTACION_KEYS;

  protected readonly datos = this.config.data as TerminarContratoModalData;

  protected readonly minFecha = fromIsoDate(this.datos.fechaDesde);

  protected readonly isSaving = signal(false);

  /** La liquidación que respondió `terminar/`; con ella el modal pasa al resumen. */
  protected readonly liquidacion = signal<Liquidacion | null>(null);

  protected readonly periodo = computed(() => {
    const l = this.liquidacion();
    if (!l) return '';
    return `${formatFechaCorta(l.fecha_desde)} – ${formatFechaCorta(l.fecha_hasta)}`;
  });

  protected readonly form = this.fb.group({
    // El fin previsto del contrato es el default natural; sigue siendo editable
    // porque la terminación real puede caer antes.
    fecha_terminacion: this.fb.control<Date | null>(fromIsoDate(this.datos.fechaHasta), [
      Validators.required,
      noAntesDe(this.minFecha),
    ]),
    motivo_terminacion: this.fb.control<ErpSelectOption | null>(null, Validators.required),
  });

  /** Monto a pesos colombianos sin decimales; `—` si no hay valor. */
  protected formatMoney(value: string | number | null | undefined): string {
    const num = typeof value === 'string' ? Number(value) : value;
    if (num == null || !Number.isFinite(num)) return '—';
    return formatCop(num);
  }

  /** Adiciones y deducciones solo se muestran si hay: recién creada suelen ser cero. */
  protected tieneMonto(value: string | number | null | undefined): boolean {
    const num = typeof value === 'string' ? Number(value) : value;
    return num != null && Number.isFinite(num) && num !== 0;
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;

    const raw = this.form.getRawValue();

    this.isSaving.set(true);
    this.service
      .terminar({
        contrato_id: this.datos.contratoId,
        fecha_terminacion: toIsoDate(raw.fecha_terminacion),
        motivo_terminacion_id: raw.motivo_terminacion?.id ?? null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (liquidacion) => {
          this.isSaving.set(false);
          // Sin liquidación que resumir: se cierra y la ficha muestra el contrato cerrado.
          if (liquidacion?.id == null) {
            this.ref.close();
            return;
          }
          this.liquidacion.set(liquidacion);
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.formErrors.handle(
            this.form,
            err,
            this.t().entities.contrato.terminar.toasts.error.title,
            {
              motivo_terminacion_id: 'motivo_terminacion',
            },
          );
        },
      });
  }

  protected onClose(): void {
    this.ref.close();
  }
}
