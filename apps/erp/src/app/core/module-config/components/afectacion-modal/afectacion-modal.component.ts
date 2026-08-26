import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, switchMap, type Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import {
  formatFechaCorta,
  anioMesDeIso,
  type DocumentoDetalleReadBase,
  DocumentoDetalleService,
  esColumnaFestiva,
  esColumnaSabado,
  FestivoService,
  formatCop,
  I18nService,
  type ProgramacionFecha,
  ToastService,
  toFiniteNumber,
  toProgramacionFecha,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { DocumentoService } from '../../data/documento.service';
import {
  ProgramacionDetalleService,
  type ProgramacionCalendarioRead,
  type ProgramacionFilaRead,
} from './programacion-detalle.service';

/** Calendario sin programaciones: degradado de la carga (documento no-servicio o fallo). */
const CALENDARIO_VACIO: ProgramacionCalendarioRead = { fechas: [], filas: [] };

/**
 * Cabecera de documento (`documento/<id>/`), recortada a lo que el modal pinta.
 *
 * Alimenta las dos cards: la del documento del detalle base (card 1) y la del
 * `documento_referencia` de ese documento (card 2, si existe). Los montos llegan
 * como string con decimales, de ahí `string | number | null`.
 */
interface AfectacionDocumentoRead {
  readonly id?: number | null;
  readonly numero?: string | null;
  readonly fecha?: string | null;
  readonly contacto_nombre?: string | null;
  readonly documento_tipo_nombre?: string | null;
  /** FK al documento de referencia (origen). Algunos serializadores lo exponen con `_id`. */
  readonly documento_referencia?: number | null;
  readonly documento_referencia_id?: number | null;
  readonly subtotal?: string | number | null;
  readonly base_impuesto?: string | number | null;
  readonly impuesto?: string | number | null;
  readonly total?: string | number | null;
}

/**
 * Línea de documento-detalle, recortada a lo que el modal lee.
 *
 * Del **detalle base** solo se usa su FK `documento` (para resolver la card 1). En
 * la **lista** de detalles que afectan se muestran `id`, `documento`, `item_nombre`,
 * `cantidad` y el `total` calculado por el backend (string con decimales).
 */
interface AfectacionDetalleRead extends DocumentoDetalleReadBase {
  /** Id del documento al que pertenece la línea (FK). */
  readonly documento?: number | null;
  /** REF: id del detalle (afectado) que esta consume; es un detalle del documento referencia. */
  readonly documento_detalle_afectado?: number | null;
  /** Totales calculados por el backend para la línea. */
  readonly total?: string | number | null;
}

/**
 * Modal de **trazabilidad** a nivel documento. Al clickear el `#` o el `REF` de una
 * línea, la ficha le pasa el **id del detalle base** (`line.id` o su
 * `documento_detalle_afectado`). El modal resuelve, a partir de ese detalle, el
 * documento al que pertenece (card 1) y el `documento_referencia` de ese documento
 * (card 2), y lista los detalles que lo afectan (`documento_detalle_afectado_id`).
 *
 * Es **autocontenido y agnóstico** del tipo de documento. Compartido por todas las
 * fichas de detalle (comerciales y de servicio), igual que `DocumentDetailActionsComponent`.
 */
@Component({
  selector: 'app-afectacion-modal',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  templateUrl: './afectacion-modal.component.html',
  styleUrl: './afectacion-modal.component.scss',
})
export class AfectacionModalComponent {
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly documentoService = inject(DocumentoService);
  private readonly programacionService = inject(ProgramacionDetalleService);
  private readonly festivoService = inject(FestivoService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Visibilidad two-way: la ficha la abre seteándola en `true`. */
  readonly visible = model<boolean>(false);
  /**
   * Id del **detalle base** a consultar: `line.id` (clic en #) o
   * `line.documento_detalle_afectado` (clic en REF). De él se resuelve el documento.
   */
  readonly detalleId = input<number | null>(null);

  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  /** Detalles que afectan al detalle base (`documento_detalle_afectado_id = detalleId`). */
  protected readonly filas = signal<readonly AfectacionDetalleRead[]>([]);
  /** Card 1: el documento del detalle base. */
  protected readonly documento = signal<AfectacionDocumentoRead | null>(null);
  /** Card 2: el `documento_referencia` de ese documento, si tiene. */
  protected readonly documentoReferencia = signal<AfectacionDocumentoRead | null>(null);
  /** Id del detalle afectado (`base.documento_detalle_afectado`), para la card 2. */
  protected readonly detalleAfectadoId = signal<number | null>(null);
  /**
   * Programaciones del detalle base: un contrato asignado a su puesto por fila.
   * Vacío cuando el documento no es de servicio (o su programación no se generó).
   */
  protected readonly programaciones = signal<readonly ProgramacionFilaRead[]>([]);
  /** Columnas de día del calendario de las programaciones (vacío si no hay). */
  protected readonly programacionFechas = signal<readonly ProgramacionFecha[]>([]);
  /** Claves ISO festivas del período — resaltan la columna del día. */
  protected readonly festivoClaves = signal<ReadonlySet<string>>(new Set());

  /**
   * Columnas de la tabla de programaciones, para el `colspan` del estado vacío:
   * la del contrato + los días + 3 de horas (H, HD, HN).
   */
  protected readonly programacionColspan = computed(() => 1 + this.programacionFechas().length + 3);

  protected readonly formatMoney = formatCop;
  /** Reglas de resaltado de columna (festivo/sábado), compartidas — ver `@reddoc/core`. */
  protected readonly esColumnaFestiva = esColumnaFestiva;
  protected readonly esColumnaSabado = esColumnaSabado;

  constructor() {
    // Al abrir, carga la afectación del detalle base. El id se lee con `untracked`
    // (la ficha lo setea junto con `visible`); solo `visible` dispara.
    effect(() => {
      if (!this.visible()) return;
      const detalleId = untracked(this.detalleId);
      if (detalleId == null) return;
      this.load(detalleId);
    });
  }

  /** Cantidad como número plano (no moneda): `"1.000000"` → `1`. */
  protected formatCantidad(value: AfectacionDetalleRead['cantidad']): string {
    const n = toFiniteNumber(value);
    return n === null ? '—' : String(n);
  }

  /** Fecha ISO (`"2026-06-17"`) a formato corto local (`17 jun 2026`), sin desfase TZ. */
  protected formatFecha(value: string | null | undefined): string {
    return formatFechaCorta(value, '—');
  }

  /** Código del turno de ese día, vacío si no tiene programación. */
  protected celda(fila: ProgramacionFilaRead, clave: string): string {
    return fila.dias?.[clave]?.turno_codigo ?? '';
  }

  /** Horas como número plano: `"72.00"` → `72`. */
  protected formatHoras(value: string | number | null | undefined): string {
    const n = toFiniteNumber(value);
    return n === null ? '—' : String(n);
  }

  /**
   * Festivos del período del calendario, como set de claves ISO para resaltar la
   * columna. Los festivos **no viajan** en la respuesta de programación (y el flag
   * de la celda no sirve: un festivo sin turno no tiene celda), así que se piden
   * aparte, igual que la ficha de turnos.
   *
   * Solo se pide si la línea tiene programaciones: así abrir el modal en una
   * factura de compra no dispara la llamada. Si falla, cae a set vacío (se pierde
   * el resaltado, no el modal).
   */
  private festivosDelPeriodo(
    calendario: ProgramacionCalendarioRead,
  ): Observable<ReadonlySet<string>> {
    const periodo = calendario.filas.length > 0 ? anioMesDeIso(calendario.fechas[0]) : null;
    if (!periodo) return of<ReadonlySet<string>>(new Set());
    return this.festivoService.getDelMes(periodo.anio, periodo.mes).pipe(
      map((festivos) => new Set(festivos.map((f) => f.fecha)) as ReadonlySet<string>),
      catchError(() => of<ReadonlySet<string>>(new Set())),
    );
  }

  private load(detalleId: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.filas.set([]);
    this.documento.set(null);
    this.documentoReferencia.set(null);
    this.detalleAfectadoId.set(null);
    this.programaciones.set([]);
    this.programacionFechas.set([]);
    this.festivoClaves.set(new Set());

    forkJoin({
      // Base: el detalle a consultar (solo se usa su FK `documento`).
      // Filas: los detalles que lo afectan (`documento_detalle_afectado_id = detalleId`).
      base: this.detalleService.obtenerPorId<AfectacionDetalleRead>(detalleId),
      filas: this.detalleService.listarPorAfectado<AfectacionDetalleRead>(detalleId),
    })
      .pipe(
        // Del documento del detalle base (card 1) y, si este tiene `documento_referencia`,
        // del documento origen (card 2). Cada fetch de documento cae a `null` si falla,
        // así el modal sigue mostrándose (la lista es independiente).
        switchMap(({ base, filas }) => {
          const docId = base.documento;
          const documento =
            docId != null
              ? this.documentoService
                  .obtenerPorId<AfectacionDocumentoRead>(docId)
                  .pipe(catchError(() => of<AfectacionDocumentoRead | null>(null)))
              : of<AfectacionDocumentoRead | null>(null);
          // Calendario del detalle base (el backend filtra por `documento_detalle`).
          // El modal es agnóstico del tipo de documento y solo los de servicio tienen
          // programación, así que el fallo cae a vacío en vez de tumbar la afectación.
          const programaciones =
            docId != null
              ? this.programacionService
                  .obtenerCalendarioDelDetalle(docId, detalleId)
                  .pipe(catchError(() => of(CALENDARIO_VACIO)))
              : of(CALENDARIO_VACIO);
          return forkJoin({ documento, programaciones }).pipe(
            switchMap(({ documento: doc, programaciones: calendario }) => {
              const refId = doc?.documento_referencia ?? doc?.documento_referencia_id ?? null;
              const referencia =
                refId != null
                  ? this.documentoService
                      .obtenerPorId<AfectacionDocumentoRead>(refId)
                      .pipe(catchError(() => of<AfectacionDocumentoRead | null>(null)))
                  : of<AfectacionDocumentoRead | null>(null);
              return forkJoin({
                referencia,
                festivos: this.festivosDelPeriodo(calendario),
              }).pipe(
                map(({ referencia: ref, festivos }) => ({
                  filas,
                  doc,
                  ref,
                  calendario,
                  festivos,
                  afectadoId: base.documento_detalle_afectado ?? null,
                })),
              );
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ filas, doc, ref, calendario, festivos, afectadoId }) => {
          this.filas.set(filas);
          this.documento.set(doc);
          this.documentoReferencia.set(ref);
          this.programaciones.set(calendario.filas);
          this.programacionFechas.set(calendario.fechas.map(toProgramacionFecha));
          this.festivoClaves.set(festivos);
          this.detalleAfectadoId.set(afectadoId);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
          const ts = this.t().documentActions.afectacion.loadError;
          this.toast.error(ts.title, ts.desc);
        },
      });
  }
}
