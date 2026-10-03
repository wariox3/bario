import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, finalize, map, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import {
  DocumentoDetalleService,
  I18nService,
  ToastService,
  formatCop,
  formatFechaCorta,
} from '@reddoc/core';
import { NominaConceptosTableComponent } from '@erp/features/humano/documentos/nomina/components/nomina-conceptos-table/nomina-conceptos-table.component';
import type {
  NominaDetalleRead,
  NominaRead,
} from '@erp/features/humano/documentos/nomina/nomina.model';
import type { AppDict } from '@erp/i18n';
import { ProgramacionService } from '../../programacion.service';

/** Datos con los que la tabla de empleados abre el modal. */
export interface NominaResumenModalData {
  readonly renglonId: number;
}

/**
 * La nómina que generó un renglón, **en solo lectura** y sin salir de la
 * programación: la cabecera (periodo, bases y totales) y sus conceptos.
 *
 * Es lo que hacía el ERP anterior. No ofrece acciones —aprobar, contabilizar—:
 * en el workspace la nómina se revisa, y su ciclo lo maneja la programación.
 * Reusa los rótulos y la tabla de conceptos de la ficha de nómina para que se
 * lea igual en los dos lugares.
 *
 * Si el renglón todavía no tiene nómina avisa y se cierra.
 */
@Component({
  selector: 'app-nomina-resumen-modal',
  standalone: true,
  imports: [ButtonModule, NominaConceptosTableComponent],
  templateUrl: './nomina-resumen-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NominaResumenModalComponent {
  private readonly service = inject(ProgramacionService);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly toast = inject(ToastService);
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig<NominaResumenModalData>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  private readonly data = this.config.data as NominaResumenModalData;

  protected readonly isLoading = signal(true);
  protected readonly cabecera = signal<NominaRead | null>(null);
  protected readonly lineas = signal<readonly NominaDetalleRead[]>([]);

  /** El número vive en la cabecera, junto a quién y cuándo: el título no lo repite. */
  protected readonly titulo = computed(
    () => this.t().entities.programacion.renglones.nominaResumen.title,
  );

  protected readonly empleado = computed(() => {
    const c = this.cabecera();
    if (!c) return '';
    return [c.contacto_numero_identificacion, c.contacto_nombre_corto].filter(Boolean).join(' - ');
  });

  constructor() {
    this.cargar();
  }

  protected onClose(): void {
    this.ref.close();
  }

  protected formatFecha(value: string | null | undefined): string {
    return formatFechaCorta(value, '');
  }

  /** Monto de cabecera; sin valor o en cero queda vacío, como en la tabla. */
  protected formatMonto(value: string | number | null | undefined): string {
    const n = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(n) && n !== 0 ? formatCop(n) : '';
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /**
   * Dos peticiones, las mínimas: el `lista/` encuentra la nómina del renglón y ya
   * trae su cabecera completa; después, sus conceptos. El renglón no conoce el id
   * de su documento, así que la búsqueda no se puede saltar.
   */
  private cargar(): void {
    const toasts = this.t().entities.programacion.renglones.toasts;
    this.service
      .nominaDelRenglon(this.data.renglonId)
      .pipe(
        map((res) => res.results[0] ?? null),
        switchMap((cabecera) => {
          if (cabecera === null) {
            this.toast.warn(toasts.sinNomina.title, toasts.sinNomina.desc);
            this.ref.close();
            return EMPTY;
          }
          return this.detalleService
            .listarPorDocumento<NominaDetalleRead>(cabecera.id)
            .pipe(map((lineas) => ({ cabecera, lineas })));
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ cabecera, lineas }) => {
          this.cabecera.set(cabecera);
          this.lineas.set(lineas);
        },
        error: () => {
          const fallo = this.t().common.toasts.loadError;
          this.toast.error(fallo.title, fallo.desc);
          this.ref.close();
        },
      });
  }
}
