import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { finalize, type Observable } from 'rxjs';
import {
  I18nService,
  ToastService,
  extractErrorMessage,
  formatCop,
  redondearMoneda,
  toFiniteNumber,
} from '@reddoc/core';
import { DataTableComponent, type PageChangeEvent } from '@reddoc/feature-base';
import { DocumentoContabilizacionService, type Movimiento } from '@erp/core/contabilidad';
import type { AppDict } from '@erp/i18n';
import { DocumentoMovimientosService } from './documento-movimientos.service';
import {
  CONTABILIDAD_DIALOG_COLUMNS,
  CONTABILIDAD_DIALOG_PAGE_SIZE,
} from './contabilidad-dialog.constants';

/** Suma de la página cargada del libro. */
interface TotalesLibro {
  readonly debitos: number;
  readonly creditos: number;
}

/**
 * Diálogo **Contabilidad** de un documento: su libro contable y las acciones
 * que lo crean o lo deshacen.
 *
 * Muestra los movimientos que generó la contabilización del documento, con
 * paginación, los totales de débito y crédito cuando todas las líneas están a
 * la vista, y una alerta si no cuadran. En el pie ofrece exportar el libro a
 * Excel y **contabilizar** o **descontabilizar** según el estado que trae el
 * documento. Lo abre el menú "Opciones → Contabilidad" de las fichas de detalle.
 *
 * Igual que `ArchivosDialogComponent`, **sí hace su HTTP**: los endpoints son los
 * mismos para todo documento (`contabilidad/movimiento/` y
 * `general/documento/(des)contabilizar/`), así que emitirlo hacia afuera
 * obligaría a repetir el cableado en cada ficha. Lo que el host aporta es el
 * documento (`documentoId`) y su estado (`contabilizado`); a cambio recibe
 * `contabilizacionChanged` para recargar su cabecera, porque el estado que
 * pinta es suyo.
 *
 * ```html
 * <app-contabilidad-dialog
 *   [(visible)]="contabilidadVisible"
 *   [documentoId]="id()"
 *   [contabilizado]="cabecera()?.estadoContabilizado ?? false"
 *   (contabilizacionChanged)="reload()"
 * />
 * ```
 *
 * La lista se pide al abrir y se refresca tras contabilizar o descontabilizar;
 * al cerrarse queda vacía, para que la próxima apertura no muestre el libro del
 * documento anterior mientras llega la respuesta.
 */
@Component({
  selector: 'app-contabilidad-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, DataTableComponent],
  templateUrl: './contabilidad-dialog.component.html',
  styleUrl: './contabilidad-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContabilidadDialogComponent {
  // ── API pública ───────────────────────────────────────────────────────────

  /** Visibilidad del diálogo (two-way: `[(visible)]`). */
  readonly visible = model<boolean>(false);

  /** Documento cuyo libro se muestra. `null` mientras la ficha aún no cargó. */
  readonly documentoId = input<number | null>(null);

  /**
   * Estado de contabilización que trae la cabecera del documento. Decide cuál
   * de las dos acciones se ofrece: contabilizar si es `false`, descontabilizar
   * si es `true`. Es del host y no se infiere del libro: un documento puede
   * estar contabilizado sin movimientos (todas las líneas en cero) y viceversa.
   */
  readonly contabilizado = input<boolean>(false);

  /** Habilita las acciones de contabilizar/descontabilizar. Default `true`. */
  readonly canContabilizar = input<boolean>(true);

  /**
   * Se emite tras contabilizar o descontabilizar con éxito. La ficha recarga su
   * cabecera: el estado que muestra (y el que gobierna `contabilizado`) cambió
   * en el backend.
   */
  readonly contabilizacionChanged = output<void>();

  // ── Colaboradores ─────────────────────────────────────────────────────────

  private readonly movimientos = inject(DocumentoMovimientosService);
  private readonly contabilizacion = inject(DocumentoContabilizacionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly columns = CONTABILIDAD_DIALOG_COLUMNS;
  protected readonly formatMoney = formatCop;

  // ── Estado ────────────────────────────────────────────────────────────────

  protected readonly items = signal<readonly Movimiento[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(CONTABILIDAD_DIALOG_PAGE_SIZE);
  /** Contabilizar o descontabilizar en curso. */
  protected readonly isProcessing = signal(false);
  protected readonly isExporting = signal(false);

  // ── Derivados ─────────────────────────────────────────────────────────────

  /** Mientras se (des)contabiliza, el diálogo no se cierra ni acepta otra acción. */
  protected readonly isBusy = computed(() => this.isProcessing());

  /**
   * Los totales solo se muestran cuando **todas** las líneas están cargadas: con
   * el libro paginado, sumar la página visible se leería como el total del
   * documento. Mismo criterio que el ERP anterior (cortaba en 50 filas).
   */
  protected readonly showTotales = computed(
    () => this.items().length > 0 && this.totalCount() <= this.items().length,
  );

  protected readonly totales = computed<TotalesLibro>(() => {
    let debitos = 0;
    let creditos = 0;
    for (const row of this.items()) {
      debitos += toFiniteNumber(row.debito) ?? 0;
      creditos += toFiniteNumber(row.credito) ?? 0;
    }
    return { debitos: redondearMoneda(debitos), creditos: redondearMoneda(creditos) };
  });

  /** Diferencia entre débitos y créditos; `0` cuando el libro cuadra. */
  protected readonly descuadre = computed(() =>
    redondearMoneda(this.totales().debitos - this.totales().creditos),
  );

  protected readonly descuadrado = computed(() => this.showTotales() && this.descuadre() !== 0);

  constructor() {
    // La lista se pide al abrir y se descarta al cerrar. El efecto depende solo
    // de `visible` y `documentoId`: `untracked` mantiene fuera lo que lee
    // `cargar`, para que paginar no vuelva a disparar el efecto.
    effect(() => {
      const abierto = this.visible();
      const documentoId = this.documentoId();
      untracked(() => {
        this.currentPage.set(0);
        if (abierto && documentoId !== null) {
          this.cargar(documentoId);
        } else {
          this.items.set([]);
          this.totalCount.set(0);
        }
      });
    });
  }

  // ── API protegida (template) ──────────────────────────────────────────────

  protected onVisibleChange(value: boolean): void {
    this.visible.set(value);
  }

  protected onClose(): void {
    if (this.isBusy()) return;
    this.visible.set(false);
  }

  protected onPageChange(event: PageChangeEvent): void {
    const documentoId = this.documentoId();
    if (documentoId === null) return;
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.cargar(documentoId);
  }

  protected contabilizar(): void {
    const documentoId = this.documentoId();
    if (documentoId === null || this.isBusy()) return;
    const toasts = this.t().documentActions.contabilidad.toasts;
    this.ejecutar(
      () => this.contabilizacion.contabilizar([documentoId]),
      toasts.contabilizarSuccess,
      toasts.contabilizarError,
    );
  }

  protected descontabilizar(): void {
    const documentoId = this.documentoId();
    if (documentoId === null || this.isBusy()) return;
    const toasts = this.t().documentActions.contabilidad.toasts;
    this.ejecutar(
      () => this.contabilizacion.descontabilizar([documentoId]),
      toasts.descontabilizarSuccess,
      toasts.descontabilizarError,
    );
  }

  /**
   * Descarga el Excel del libro. No entra en `isBusy`: es una lectura, no
   * bloquea (des)contabilizar, y solo deshabilita su propio botón mientras viaja.
   */
  protected exportarExcel(): void {
    const documentoId = this.documentoId();
    if (documentoId === null || this.isExporting()) return;

    this.isExporting.set(true);
    this.movimientos
      .exportarExcel(documentoId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isExporting.set(false)),
      )
      .subscribe({
        error: () => {
          const toast = this.t().common.toasts.exportError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private cargar(documentoId: number): void {
    this.isLoading.set(true);
    this.movimientos
      .listar(documentoId, { page: this.currentPage(), pageSize: this.pageSize() })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.items.set(response.results ?? []);
          this.totalCount.set(response.count ?? 0);
        },
        error: () => {
          this.items.set([]);
          this.totalCount.set(0);
          const toast = this.t().documentActions.contabilidad.toasts.loadError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  /**
   * Flujo común de contabilizar y descontabilizar: toast, aviso al host y
   * recarga del libro desde la primera página —el movimiento acaba de nacer o
   * de borrarse, así que lo que se estaba viendo ya no existe—.
   *
   * En error también se recarga: el ERP anterior lo hacía porque el backend
   * puede haber dejado el documento a medias, y el libro es la evidencia.
   */
  private ejecutar(
    accion: () => Observable<unknown>,
    success: { readonly title: string; readonly desc: string },
    error: { readonly title: string; readonly desc: string },
  ): void {
    const documentoId = this.documentoId();
    if (documentoId === null) return;

    this.isProcessing.set(true);
    accion()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isProcessing.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(success.title, success.desc);
          this.contabilizacionChanged.emit();
          this.currentPage.set(0);
          this.cargar(documentoId);
        },
        error: (err: unknown) => {
          this.toast.error(error.title, extractErrorMessage(err, error.desc));
          this.currentPage.set(0);
          this.cargar(documentoId);
        },
      });
  }
}
