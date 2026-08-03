import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { I18nService, ToastService, formatCop } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { LineaNominaDelContrato, NominaDelContrato } from './nominas-contrato.model';
import { NominasContratoService } from './nominas-contrato.service';
import { totalesDe } from './nominas-contrato.totales';

/** Datos con los que la pestaña de contratos abre el modal. */
export interface NominasContratoModalData {
  /** Contrato del empleado, no el renglón del aporte. */
  readonly contratoId: number;
  readonly empleado: string | null;
  /** Periodo del aporte: acota qué nóminas se cruzan. */
  readonly fechaDesde: string | null;
  readonly fechaHasta: string | null;
}

/** Campos que se totalizan en cada tabla. */
const CAMPOS_NOMINA = [
  'salario',
  'base_cotizacion',
  'base_prestacion',
  'devengado',
  'deduccion',
  'total',
] as const;

const CAMPOS_LINEA = ['base_cotizacion', 'base_prestacion', 'devengado', 'deduccion'] as const;

/**
 * Cruce entre un contrato del aporte y las **nóminas ya liquidadas** del periodo.
 *
 * Responde la única pregunta que no contesta ninguna otra pantalla: *de dónde
 * salió el IBC que se le está cotizando a este empleado*. Por eso es un modal y
 * no un link a la ficha de nómina — lo que hace falta ver son **varias** nóminas
 * filtradas por contrato y periodo, con sus conceptos y sus totales cruzados.
 *
 * Solo lectura. Las dos consultas van en paralelo y se totalizan completas, sin
 * paginar.
 */
@Component({
  selector: 'app-nominas-contrato-modal',
  standalone: true,
  imports: [ButtonModule],
  providers: [NominasContratoService],
  templateUrl: './nominas-contrato-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NominasContratoModalComponent {
  private readonly service = inject(NominasContratoService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref = inject(DynamicDialogRef);
  private readonly config =
    inject<DynamicDialogConfig<NominasContratoModalData>>(DynamicDialogConfig);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly formatMoney = formatCop;

  protected readonly datos = this.config.data as NominasContratoModalData;

  protected readonly isLoading = signal(true);
  protected readonly nominas = signal<readonly NominaDelContrato[]>([]);
  protected readonly lineas = signal<readonly LineaNominaDelContrato[]>([]);

  protected readonly totalesNomina = computed(() => totalesDe(this.nominas(), CAMPOS_NOMINA));
  protected readonly totalesLinea = computed(() => totalesDe(this.lineas(), CAMPOS_LINEA));

  protected readonly sinNominas = computed(() => !this.isLoading() && this.nominas().length === 0);

  constructor() {
    const { contratoId, fechaDesde, fechaHasta } = this.datos;
    forkJoin({
      nominas: this.service.listarNominas(contratoId, fechaDesde, fechaHasta),
      lineas: this.service.listarLineas(contratoId, fechaDesde, fechaHasta),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: ({ nominas, lineas }) => {
          this.nominas.set(nominas.results);
          this.lineas.set(lineas.results);
        },
        error: () =>
          this.toast.error(
            this.t().common.toasts.loadError.title,
            this.t().common.toasts.loadError.desc,
          ),
      });
  }

  protected onClose(): void {
    this.ref.close();
  }
}
