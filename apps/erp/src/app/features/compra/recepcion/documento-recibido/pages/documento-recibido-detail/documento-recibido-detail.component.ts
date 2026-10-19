import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
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
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import { DIAN_DOCUMENT_URL } from '@erp/features/documentos/dian-document-url';
import type { AppDict } from '@erp/i18n';
import { EVENTO_COLUMNS, EVENTO_ROW_ACTIONS } from '../../documento-recibido.constants';
import { toDocumentoRecibidoRow, type DocumentoRecibidoRow } from '../../documento-recibido.model';
import { DocumentoRecibidoService } from '../../documento-recibido.service';
import type { EventoRadian } from '../../evento-radian.model';
import { EventoRadianService } from '../../evento-radian.service';

/** Código DIAN de un documento validado. */
const VALIDACION_OK = '02';

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
 * Bajo la cabecera, dos tabs: **Adjuntos** y **Eventos RADIAN** (los eventos
 * que la empresa registró en la DIAN sobre el documento).
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

  protected readonly eventoColumns = EVENTO_COLUMNS;
  protected readonly eventoRowActions = EVENTO_ROW_ACTIONS;

  /** Eventos RADIAN del documento; `undefined` mientras se consultan. */
  private readonly eventosCarga = toSignal(
    toObservable(this.id).pipe(
      switchMap((documento) =>
        this.eventoService.listar({ documento, ordering: 'creado_en' }).pipe(
          map((eventos): readonly EventoRadian[] | undefined => eventos),
          catchError(() => of([])),
          startWith(undefined),
        ),
      ),
    ),
    { initialValue: undefined },
  );
  protected readonly eventos = computed(() => this.eventosCarga() ?? []);
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
      validado: doc.validacion_codigo === VALIDACION_OK,
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
