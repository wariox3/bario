import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import {
  I18nService,
  TenantService,
  formatCop,
  formatFechaCorta,
  formatFechaLarga,
  toHora,
} from '@reddoc/core';
import {
  BreadcrumbComponent,
  DataTableComponent,
  type BreadcrumbItem,
  type PageChangeEvent,
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import { DIAN_DOCUMENT_URL } from '@erp/features/documentos/dian-document-url';
import type { AppDict } from '@erp/i18n';
import {
  ADJUNTO_ACTION_DESCARGAR,
  ADJUNTO_COLUMNS,
  ADJUNTO_ROW_ACTIONS,
  EVENTO_COLUMNS,
  EVENTO_ROW_ACTIONS,
} from '../../documento-recibido.constants';
import {
  toDocumentoRecibidoRow,
  type DocumentoRecibidoRow,
  type VerificacionEstado,
} from '../../documento-recibido.model';
import { DocumentoRecibidoService } from '../../documento-recibido.service';
import { toEventoRadianRow, type EventoRadianRow } from '../../evento-radian.model';
import { EventoRadianService } from '../../evento-radian.service';
import {
  ADJUNTO_PAGE_SIZE,
  toRecepcionAdjuntoRow,
  type RecepcionAdjuntoRow,
} from '../../recepcion-adjunto.model';
import { RecepcionAdjuntoService } from '../../recepcion-adjunto.service';

/** Pill de la verificación DIAN en la barra de título: color e ícono por estado. */
const VERIFICACION_PILL: Record<
  VerificacionEstado,
  { readonly clase: string; readonly icono: string }
> = {
  valido: { clase: 'bg-emerald-50 text-emerald-700', icono: 'pi pi-check-circle' },
  invalido: { clase: 'bg-red-50 text-red-600', icono: 'pi pi-times-circle' },
  error: { clase: 'bg-amber-50 text-amber-700', icono: 'pi pi-exclamation-triangle' },
  no_verificable: {
    clase: 'bg-[rgba(20,48,73,0.06)] text-brand-muted',
    icono: 'pi pi-minus-circle',
  },
  pendiente: { clase: 'bg-[rgba(20,48,73,0.06)] text-brand-muted', icono: 'pi pi-clock' },
};

/** Lo mínimo que se lee de una página del backend. */
interface Pagina<T> {
  readonly count: number;
  readonly results: readonly T[];
}

/** Página vacía para cuando la consulta falla: la tab muestra su estado vacío. */
const SIN_FILAS: Pagina<never> = { count: 0, results: [] };

/** Estado de la carga: `undefined` mientras se consulta, `null` si no apareció. */
type Carga = DocumentoRecibidoRow | null | undefined;

/**
 * Ficha de un documento recibido (Compra › Recepción › Documentos). Solo
 * lectura: el documento es del proveedor y RedEDoc lo guarda tal cual llegó.
 *
 * El backend no tiene `GET` por id, así que la lista abre la ficha con el CUE y
 * la fecha de emisión en la URL y el servicio lo busca en la bandeja. Sin esos
 * dos datos (un enlace recortado) la ficha cae a "no encontrado".
 *
 * Bajo la cabecera, dos tabs: **Eventos RADIAN** (los que la empresa
 * registró en la DIAN sobre el documento) y **Adjuntos**.
 */
@Component({
  selector: 'app-documento-recibido-detail',
  standalone: true,
  imports: [ButtonModule, TabsModule, BreadcrumbComponent, DataTableComponent],
  templateUrl: './documento-recibido-detail.component.html',
  styleUrl: './documento-recibido-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentoRecibidoDetailComponent {
  private readonly service = inject(DocumentoRecibidoService);
  private readonly eventoService = inject(EventoRadianService);
  private readonly adjuntoService = inject(RecepcionAdjuntoService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  protected readonly t = inject<I18nService<AppDict>>(I18nService).t;

  /** Route param y query params (`withComponentInputBinding`). */
  readonly id = input.required<string>();
  readonly cue = input<string>();
  readonly fecha = input<string>();

  private readonly busqueda = computed(() => ({
    id: this.id(),
    cue: this.cue(),
    fecha: this.fecha(),
  }));

  private readonly carga = toSignal(
    toObservable(this.busqueda).pipe(
      switchMap(({ id, cue, fecha }) =>
        cue && fecha
          ? this.service.obtener(id, cue, fecha).pipe(
              map((doc): Carga => (doc ? toDocumentoRecibidoRow(doc) : null)),
              catchError(() => of(null)),
              startWith(undefined),
            )
          : of(null),
      ),
    ),
    { initialValue: undefined as Carga },
  );

  protected readonly adjuntoColumns = ADJUNTO_COLUMNS;
  protected readonly adjuntoRowActions = ADJUNTO_ROW_ACTIONS;

  /** Página de adjuntos (base 0); el backend los da de a 10. */
  protected readonly adjuntosPage = signal(0);
  protected readonly adjuntosPageSize = ADJUNTO_PAGE_SIZE;

  /** Adjuntos de la página; `undefined` mientras se consultan. */
  private readonly adjuntosCarga = toSignal(
    toObservable(computed(() => ({ documento: this.id(), page: this.adjuntosPage() + 1 }))).pipe(
      switchMap((query) =>
        this.adjuntoService.listar(query).pipe(
          map((res): Pagina<RecepcionAdjuntoRow> | undefined => ({
            count: res.count,
            results: res.results.map(toRecepcionAdjuntoRow),
          })),
          catchError(() => of(SIN_FILAS)),
          startWith(undefined),
        ),
      ),
    ),
    { initialValue: undefined },
  );
  protected readonly adjuntos = computed(() => this.adjuntosCarga()?.results ?? []);
  protected readonly adjuntosTotal = computed(() => this.adjuntosCarga()?.count ?? 0);
  protected readonly adjuntosLoading = computed(() => this.adjuntosCarga() === undefined);

  protected readonly eventoColumns = EVENTO_COLUMNS;
  protected readonly eventoRowActions = EVENTO_ROW_ACTIONS;

  /**
   * Eventos RADIAN del documento, en orden de registro. Un documento junta
   * pocos (uno por código y sus reintentos): con el máximo de 100 no se pagina.
   */
  private readonly eventosCarga = toSignal(
    toObservable(this.id).pipe(
      switchMap((documento) =>
        this.eventoService.listar({ documento, ordering: 'creado_en', page_size: 100 }).pipe(
          map((res): Pagina<EventoRadianRow> | undefined => ({
            count: res.count,
            results: res.results.map(toEventoRadianRow),
          })),
          catchError(() => of(SIN_FILAS)),
          startWith(undefined),
        ),
      ),
    ),
    { initialValue: undefined },
  );
  protected readonly eventos = computed(() => this.eventosCarga()?.results ?? []);
  protected readonly eventosTotal = computed(() => this.eventosCarga()?.count ?? 0);
  protected readonly eventosLoading = computed(() => this.eventosCarga() === undefined);

  protected readonly isLoading = computed(() => this.carga() === undefined);
  protected readonly notFound = computed(() => this.carga() === null);

  protected readonly vista = computed(() => {
    const doc = this.carga();
    if (!doc) return null;
    const d = this.t().entities.documentoRecibido;
    return {
      doc,
      tipo: d.tipos[doc.documento_tipo] ?? doc.documento_tipo,
      emision: [formatFechaLarga(doc.fecha_emision, ''), doc.hora_emision.slice(0, 5)]
        .filter(Boolean)
        .join(' · '),
      verificacion: {
        ...VERIFICACION_PILL[doc.verificacion_estado],
        label: d.detalle.verificacion[doc.verificacion_estado] ?? doc.verificacion_estado,
        descripcion: doc.verificacion_descripcion ?? '',
      },
      fechaValidacion: formatFechaCorta(doc.fecha_validacion, ''),
      recibido: doc.creado_en
        ? `${formatFechaCorta(doc.creado_en, '')} ${toHora(new Date(doc.creado_en))}`
        : '',
      dianUrl: doc.cufe_cude ? `${DIAN_DOCUMENT_URL}${doc.cufe_cude}` : null,
      valorBruto: formatCop(doc.valor_bruto),
      impuestos: formatCop(doc.total_impuestos),
      total: formatCop(doc.total_a_pagar),
    };
  });

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const moduleBase = slug ? ['/t', slug, currentModuleId(this.activeModule)] : undefined;
    const d = this.t().entities.documentoRecibido;
    return [
      { label: resolveModuleName(this.activeModule, this.t()), routerLink: moduleBase },
      {
        label: d.name,
        routerLink: moduleBase ? [...moduleBase, 'recepcion', 'documentos'] : undefined,
      },
      { label: this.carga()?.numero ?? d.detalle.title },
    ];
  });

  protected onAdjuntosPage(event: PageChangeEvent): void {
    this.adjuntosPage.set(event.page);
  }

  protected onAdjuntoAction(event: RowActionInvokedEvent): void {
    if (event.actionId !== ADJUNTO_ACTION_DESCARGAR) return;
    const adjunto = event.row as RecepcionAdjuntoRow;
    this.adjuntoService.descargar(adjunto.id, adjunto.nombre).subscribe();
  }

  // TODO: XML y Respuesta, cuando se confirme de dónde sale cada archivo.
  protected onEventoAction(event: RowActionInvokedEvent): void {
    console.log('[recepcion/evento] acción', event.actionId, event.row);
  }

  protected onBack(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate([
      '/t',
      slug,
      currentModuleId(this.activeModule),
      'recepcion',
      'documentos',
    ]);
  }
}
