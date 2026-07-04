import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { I18nService, ToastService, formatCop, toFiniteNumber } from '@reddoc/core';
import type { DocumentoDetalleReadBase } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { DocumentoDetalleService } from '../../data/documento-detalle.service';
import { DocumentoService } from '../../data/documento.service';

/** Cabecera de documento, recortada a lo que el modal lee (`documento_tipo_nombre`). */
interface AfectacionDocumentoRead {
  readonly documento_tipo_nombre?: string | null;
}

/**
 * Línea de documento-detalle, recortada a lo que el modal de afectación pinta.
 *
 * Extiende `DocumentoDetalleReadBase` (de `@reddoc/core`) para reutilizar los campos
 * comunes de línea (`id`, `item`, `item_nombre`, `cantidad`, `precio`, `impuestos`) y
 * solo agrega lo que el backend devuelve por línea pero el base aún no tipa: el FK
 * `documento`, las fechas/atributos de servicio y los **totales calculados** (que hoy
 * solo viven tipados a nivel documento en `DocumentoListRowBase`). Los montos y horas
 * llegan como string con decimales, de ahí `string | number | null`.
 */
interface AfectacionDetalleRead extends DocumentoDetalleReadBase {
  /** Id del documento al que pertenece la línea (FK; sin número/tipo legible aún). */
  readonly documento?: number | null;
  /** Atributos de servicio (ausentes en líneas comerciales → se ocultan). */
  readonly fecha_desde?: string | null;
  readonly fecha_hasta?: string | null;
  readonly puesto_nombre?: string | null;
  readonly modalidad_nombre?: string | null;
  /** Totales calculados por el backend para la línea. */
  readonly subtotal?: string | number | null;
  readonly base_impuesto?: string | number | null;
  readonly impuesto?: string | number | null;
  readonly impuesto_retencion?: string | number | null;
  readonly total?: string | number | null;
}

/**
 * Modal de **trazabilidad** de una línea: al clickear su `#`/`REF` en la ficha de
 * detalle, muestra una franja-resumen de la línea origen y, debajo, la tabla de
 * "quién la afecta" (líneas de otros documentos que la referencian).
 *
 * Es **autocontenido y agnóstico** del tipo de documento: recibe `lineId` + `visible`
 * y dispara sus dos peticiones al `DocumentoDetalleService` al abrirse. Compartido por
 * todas las fichas de detalle (factura de venta, servicio y futuras), igual que
 * `DocumentDetailActionsComponent`.
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
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Visibilidad two-way: la ficha la abre seteándola en `true`. */
  readonly visible = model<boolean>(false);
  /** Id de la línea clickeada; arma la cabecera (`obtenerPorId`). */
  readonly lineId = input<number | null>(null);
  /**
   * `documento_detalle_afectado` (REF) de la línea clickeada; con él se consulta
   * "quién la afecta". Si es `null` (línea sin REF) la tabla queda vacía.
   */
  readonly afectadoId = input<number | null>(null);

  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly cabecera = signal<AfectacionDetalleRead | null>(null);
  protected readonly filas = signal<readonly AfectacionDetalleRead[]>([]);
  /** Nombre del tipo de documento de la línea (de `documento/<id>/`), para el header de la ficha. */
  protected readonly documentoTipoNombre = signal<string | null>(null);

  protected readonly formatMoney = formatCop;

  constructor() {
    // Al abrir, carga la afectación de la línea activa. Los ids se leen con
    // `untracked` (la ficha los setea junto con `visible`); solo `visible` dispara.
    effect(() => {
      if (!this.visible()) return;
      const lineId = untracked(this.lineId);
      if (lineId == null) return;
      this.load(lineId, untracked(this.afectadoId));
    });
  }

  /** Cantidad como número plano (no moneda): `"1.000000"` → `1`. */
  protected formatCantidad(value: AfectacionDetalleRead['cantidad']): string {
    const n = toFiniteNumber(value);
    return n === null ? '—' : String(n);
  }

  /** Fecha ISO (`"2026-06-17"`) a formato corto local (`17 jun 2026`), sin desfase TZ. */
  protected formatFecha(value: string | null | undefined): string {
    if (!value) return '—';
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return value;
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private load(lineId: number, afectadoId: number | null): void {
    this.loading.set(true);
    this.error.set(false);
    this.cabecera.set(null);
    this.filas.set([]);
    this.documentoTipoNombre.set(null);

    forkJoin({
      // Cabecera: la línea clickeada. Tabla: quién afecta a su origen (REF). Sin
      // REF no hay a quién consultar → lista vacía sin pegarle al backend.
      cabecera: this.detalleService.obtenerPorId<AfectacionDetalleRead>(lineId),
      filas:
        afectadoId == null
          ? of<AfectacionDetalleRead[]>([])
          : this.detalleService.listarPorAfectado<AfectacionDetalleRead>(afectadoId),
    })
      .pipe(
        // El nombre del tipo de documento vive en la cabecera del documento
        // (`documento/<id>/`), no en la línea: con el FK `documento` de la línea se
        // trae aparte. Si falla o no hay documento, la ficha sigue mostrándose.
        switchMap(({ cabecera, filas }) => {
          const docId = cabecera.documento;
          const documento =
            docId != null
              ? this.documentoService
                  .obtenerPorId<AfectacionDocumentoRead>(docId)
                  .pipe(catchError(() => of<AfectacionDocumentoRead | null>(null)))
              : of<AfectacionDocumentoRead | null>(null);
          return documento.pipe(map((doc) => ({ cabecera, filas, doc })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ cabecera, filas, doc }) => {
          this.cabecera.set(cabecera);
          this.filas.set(filas);
          this.documentoTipoNombre.set(doc?.documento_tipo_nombre ?? null);
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
