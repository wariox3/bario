import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { I18nService, ToastService, formatCop, formatFechaCorta } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { LineaNominaDelContrato, NominaDelContrato } from './nominas-contrato.model';
import { NominasContratoService } from './nominas-contrato.service';
import { conDocumento, totalesDe } from './nominas-contrato.totales';

/** Datos con los que la pestaña de contratos abre el modal. */
export interface NominasContratoModalData {
  /** Contrato del empleado, no el renglón del aporte. */
  readonly contratoId: number;
  readonly empleado: string | null;
  /** Periodo del aporte: acota qué nóminas se cruzan. */
  readonly fechaDesde: string | null;
  readonly fechaHasta: string | null;
}

/** Campos que se totalizan en cada tabla, los mismos que el ERP anterior. */
const CAMPOS_DOCUMENTO = [
  'base_cotizacion',
  'base_prestacion',
  'devengado',
  'deduccion',
  'total',
] as const;

const CAMPOS_DETALLE = ['devengado', 'deduccion', 'base_cotizacion', 'base_prestacion'] as const;

/**
 * "Ver detalle" de un contrato del aporte: las **nóminas ya liquidadas** del
 * periodo y sus conceptos, en dos tablas con sus totales.
 *
 * Responde la única pregunta que no contesta ninguna otra pantalla: *de dónde
 * salió el IBC que se le está cotizando a este empleado*. Por eso es un modal y
 * no un link a la ficha de nómina — lo que hace falta ver son **varias** nóminas
 * filtradas por contrato y periodo, con sus conceptos.
 *
 * Solo lectura. Las dos consultas van en paralelo y se totalizan completas, sin
 * paginar. El contrato no lo trae el documento: es el mismo con el que se
 * filtra, así que se pinta el que llega en los datos.
 */
@Component({
  selector: 'app-nominas-contrato-modal',
  standalone: true,
  imports: [ButtonModule, DecimalPipe],
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
  protected readonly documentos = signal<readonly NominaDelContrato[]>([]);
  private readonly lineas = signal<readonly LineaNominaDelContrato[]>([]);

  /** Cada concepto con el tipo y el número de su nómina. */
  protected readonly detalles = computed(() => conDocumento(this.lineas(), this.documentos()));

  protected readonly totalesDocumento = computed(() =>
    totalesDe(this.documentos(), CAMPOS_DOCUMENTO),
  );
  protected readonly totalesDetalle = computed(() => totalesDe(this.lineas(), CAMPOS_DETALLE));

  /** "Nóminas de camilo vargas"; sin empleado, el título genérico. */
  protected readonly titulo = computed(() => {
    const m = this.t().entities.aporte.trazabilidad;
    return this.datos.empleado ? `${m.title} ${this.datos.empleado}` : m.sinEmpleado;
  });

  constructor() {
    const { contratoId, fechaDesde, fechaHasta } = this.datos;
    forkJoin({
      documentos: this.service.listarNominas(contratoId, fechaDesde, fechaHasta),
      lineas: this.service.listarLineas(contratoId, fechaDesde, fechaHasta),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: ({ documentos, lineas }) => {
          this.documentos.set(documentos.results);
          this.lineas.set(lineas.results);
        },
        error: () =>
          this.toast.error(
            this.t().common.toasts.loadError.title,
            this.t().common.toasts.loadError.desc,
          ),
      });
  }

  /** Fecha corta (`05/08/2026`); raya si no hay. */
  protected formatFecha(value: string | null): string {
    return formatFechaCorta(value, '—');
  }

  protected onClose(): void {
    this.ref.close();
  }
}
