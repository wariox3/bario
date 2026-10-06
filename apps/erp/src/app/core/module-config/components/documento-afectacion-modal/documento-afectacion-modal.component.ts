import {
  ChangeDetectionStrategy,
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
import { catchError, forkJoin, map, of, switchMap, type Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import {
  type BackendFilter,
  DocumentoDetalleService,
  I18nService,
  ToastService,
  formatCop,
  formatFechaCorta,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { DocumentoService } from '../../data/documento.service';
import { AfectacionDocumentoCardComponent } from '../afectacion-documento-card/afectacion-documento-card.component';
import type { AfectacionDocumentoRead } from '../afectacion-documento-card/afectacion-documento.types';

/**
 * Línea de otro documento que afecta a este **por cabecera** (`documento_afectado`),
 * recortada a lo que pinta la tabla. Así enlazan los pagos de cartera la factura
 * que cancelan: la línea no apunta a una línea de la factura sino a la factura.
 */
interface LineaAfectaRead {
  readonly id?: number | null;
  /** Documento al que pertenece la línea: el que afecta. */
  readonly documento?: number | null;
  /** Tipo de ese documento (`"PAGO"`): dice de dónde viene la afectación. */
  readonly documento_documento_tipo_nombre?: string | null;
  /**
   * Fecha de ese documento. TODO(backend): la línea aún no la serializa; pedida
   * con este nombre, en el mismo patrón que `documento_documento_tipo_nombre`.
   * Mientras no llegue, la columna queda vacía.
   */
  readonly documento_fecha?: string | null;
  readonly documento_afectado?: number | null;
  /** `'C'` = línea de cuenta (pagos); otro valor = línea de ítem. */
  readonly tipo_registro?: string | null;
  readonly item_nombre?: string | null;
  readonly cuenta_codigo?: string | null;
  readonly cuenta_nombre?: string | null;
  readonly precio?: string | number | null;
  readonly total?: string | number | null;
}

/**
 * Modal de **afectación de un documento**, abierto desde el `id` del listado
 * (`capabilities.canViewAfectacion`): el documento, su documento de referencia y
 * las líneas de otros documentos que lo afectan.
 *
 * Es aparte del `AfectacionModalComponent` de la ficha porque responde otra
 * pregunta: aquel parte de una **línea** («¿quién consume este detalle?», con
 * sus programaciones); este, del **documento**. Comparten la card del documento.
 *
 * Hoy cubre lo que enlaza por cabecera (`documento_afectado`), que es como lo
 * hacen los pagos de cartera. Las notas crédito/débito enlazan la factura por su
 * `documento_referencia`; se sumarán cuando el backend las deje listas.
 */
@Component({
  selector: 'app-documento-afectacion-modal',
  standalone: true,
  imports: [DialogModule, ButtonModule, AfectacionDocumentoCardComponent],
  templateUrl: './documento-afectacion-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentoAfectacionModalComponent {
  private readonly documentoService = inject(DocumentoService);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Visibilidad two-way: el listado lo abre seteándola en `true`. */
  readonly visible = model<boolean>(false);
  /** Documento a consultar (el `id` de la fila clicada). */
  readonly documentoId = input<number | null>(null);

  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly documento = signal<AfectacionDocumentoRead | null>(null);
  protected readonly documentoReferencia = signal<AfectacionDocumentoRead | null>(null);
  protected readonly filas = signal<readonly LineaAfectaRead[]>([]);

  protected readonly formatMoney = formatCop;

  constructor() {
    // Al abrir, carga. El id se lee con `untracked` (el listado lo setea junto con
    // `visible`); solo `visible` dispara.
    effect(() => {
      if (!this.visible()) return;
      const documentoId = untracked(this.documentoId);
      if (documentoId != null) this.load(documentoId);
    });
  }

  /** Fecha ISO a formato corto (`05/08/2026`), sin desfase TZ. */
  protected formatFecha(value: string | null | undefined): string {
    return formatFechaCorta(value, '');
  }

  /** Qué es la línea: su ítem o, en las de cuenta (pagos), su cuenta contable. */
  protected concepto(fila: LineaAfectaRead): string {
    if (fila.item_nombre) return fila.item_nombre;
    return [fila.cuenta_codigo, fila.cuenta_nombre].filter(Boolean).join(' - ');
  }

  /**
   * Valor con que la línea afecta. Una línea de cuenta lleva el monto en `precio`
   * y deja `total` en cero (verificado contra un pago real); una de ítem, en `total`.
   */
  protected valor(fila: LineaAfectaRead): string | number {
    return (fila.tipo_registro === 'C' ? fila.precio : fila.total) ?? 0;
  }

  private load(documentoId: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.documento.set(null);
    this.documentoReferencia.set(null);
    this.filas.set([]);

    forkJoin({
      doc: this.documentoService.obtenerPorId<AfectacionDocumentoRead>(documentoId),
      filas: this.lineasQueAfectan(documentoId),
    })
      .pipe(
        switchMap(({ doc, filas }) =>
          this.referenciaDe(doc).pipe(map((ref) => ({ doc, ref, filas }))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ doc, ref, filas }) => {
          this.documento.set(doc);
          this.documentoReferencia.set(ref);
          this.filas.set(filas);
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

  /**
   * Líneas de otros documentos con `documento_afectado = documentoId`. El backend
   * ignora en silencio un filtro que no tenga declarado y devuelve la lista sin
   * filtrar, así que se vuelve a acotar aquí: en el peor caso faltarían filas,
   * nunca se mostraría como «afecta» una línea ajena.
   */
  private lineasQueAfectan(documentoId: number): Observable<readonly LineaAfectaRead[]> {
    const filtros: BackendFilter[] = [
      { propiedad: 'documento_afectado_id', operador: '=', valor: documentoId },
    ];
    return this.detalleService
      .listarPorFiltros<LineaAfectaRead>(filtros)
      .pipe(
        map((filas) =>
          filas.filter((f) => f.documento_afectado === documentoId && f.documento !== documentoId),
        ),
      );
  }

  /** `documento_referencia` del documento, o `null` si no tiene o no carga. */
  private referenciaDe(doc: AfectacionDocumentoRead): Observable<AfectacionDocumentoRead | null> {
    const refId = doc.documento_referencia ?? doc.documento_referencia_id ?? null;
    if (refId == null) return of(null);
    return this.documentoService
      .obtenerPorId<AfectacionDocumentoRead>(refId)
      .pipe(catchError(() => of<AfectacionDocumentoRead | null>(null)));
  }
}
