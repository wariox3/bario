import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, type PaginatorState } from 'primeng/paginator';
import { TabsModule } from 'primeng/tabs';
import {
  formatFechaLarga,
  I18nService,
  TenantService,
  ToastService,
  calcularResumen,
  LIST_PAGE_SIZE,
  resumenDesdeCabecera,
  type ResumenDocumento,
  type DocumentoEstados,
  comercialDetalleToFormValue,
  toLineaCalculo,
  type ComercialDetalleRead,
  type ComercialDetalleFormRawValue,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { compraDocumentoBreadcrumb } from '@erp/features/compra/shared/compra-breadcrumb';
import { DIAN_DOCUMENT_URL } from '@erp/features/documentos/dian-document-url';
import { DocumentoElectronicoMenuComponent } from '@erp/features/documentos/electronico/components/documento-electronico-menu/documento-electronico-menu.component';
import {
  CAPACIDADES_DOCUMENTO_VACIAS,
  DocumentoDetalleService,
  ENTITY_DATA_GATEWAY,
  capacidadesDocumento,
} from '@erp/core/module-config';
import type { CapacidadesDocumento, DocumentEntityConfig } from '@erp/core/module-config';
import type { AppDict } from '@erp/i18n';
import { ComercialDocumentoLineasTableComponent } from '@erp/features/documentos/comercial/components/comercial-documento-lineas-table/comercial-documento-lineas-table.component';
import { ComercialDocumentoResumenComponent } from '@erp/features/documentos/comercial/components/comercial-documento-resumen/comercial-documento-resumen.component';
import { DocumentDetailActionsComponent } from '@erp/core/module-config/components/document-detail-actions/document-detail-actions.component';
import { DocumentEstadosComponent } from '@erp/core/module-config/components/document-estados/document-estados.component';
import { AfectacionModalComponent } from '@erp/core/module-config/components/afectacion-modal/afectacion-modal.component';
import { notaAjusteToFormValue } from '../../nota-ajuste.mapper';
import type { NotaAjusteRead } from '../../nota-ajuste.model';

/** Cabecera legible de la nota ajuste para la ficha (solo lo que trae `getById`). */
interface CabeceraView {
  readonly numero: string | null;
  readonly proveedor: string | null;
  /** Identificación del contacto (`contacto_numero_identificacion` del read). */
  readonly identificacion: string | null;
  readonly fecha: Date | null;
  readonly documentoReferencia: string | null;
  readonly plazoPago: string | null;
  readonly metodoPago: string | null;
  readonly conceptoCorreccion: string | null;
  readonly centroCosto: string | null;
  readonly ordenCompra: string | null;
  /** CUE de la DIAN; vacío mientras la nota no se haya emitido. */
  readonly cue: string | null;
  readonly comentario: string | null;
  /**
   * Banderas de estado (ciclo de vida) del documento. Alimentan los badges de la
   * ficha y las acciones de la botonera (p. ej. no se re-aprueba lo ya aprobado).
   */
  readonly estados: DocumentoEstados;
}

/**
 * Ficha (detalle) de una **Nota ajuste** (familia comercial) — solo lectura.
 *
 * Carga cabecera (`ENTITY_DATA_GATEWAY.getById`) y líneas (`DocumentoDetalleService`)
 * en paralelo —igual que el form— y las muestra sin formularios. Desde aquí se
 * vuelve a la lista o se salta a editar.
 */
@Component({
  selector: 'app-nota-ajuste-detail',
  standalone: true,
  imports: [
    PaginatorModule,
    ButtonModule,
    DocumentoElectronicoMenuComponent,
    BreadcrumbComponent,
    ComercialDocumentoLineasTableComponent,
    ComercialDocumentoResumenComponent,
    DocumentDetailActionsComponent,
    DocumentEstadosComponent,
    AfectacionModalComponent,
    TabsModule,
  ],
  templateUrl: './nota-ajuste-detail.component.html',
  styleUrl: './nota-ajuste-detail.component.scss',
})
export class NotaAjusteDetailComponent implements OnInit {
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Documento activo inyectado por `activeDocumentResolver` vía router binding. */
  readonly document = input.required<DocumentEntityConfig>();

  /** Id del documento (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  /** Enlace a la consulta pública de la DIAN; `null` mientras no haya CUE. */
  protected readonly dianUrl = computed(() => {
    const cue = this.cabecera()?.cue;
    return cue ? `${DIAN_DOCUMENT_URL}${cue}` : null;
  });

  /** Id como número para el dropdown Electrónico (`null` si la ruta no lo trae). */
  protected readonly documentoIdNumero = computed(() => {
    const id = this.id();
    return id ? Number(id) : null;
  });

  protected readonly cabecera = signal<CabeceraView | null>(null);
  /** Página visible de las líneas de ítem, ya mapeadas a la forma del front. */
  protected readonly lines = signal<readonly ComercialDetalleFormRawValue[]>([]);
  protected readonly pageSize = LIST_PAGE_SIZE;
  /** Página visible de los ítems, 0-based como `p-paginator`. */
  protected readonly pagina = signal(0);
  /** Líneas de ítem del documento según el backend. */
  protected readonly totalItems = signal(0);
  protected readonly cargandoItems = signal(false);
  /**
   * Resumen con los acumulados del backend (`resumenDesdeCabecera`): con las
   * líneas paginadas no se puede sumar en el front. `null` si la cabecera no trae
   * el desglose por impuesto: se suman las líneas.
   */
  private readonly resumenCabecera = signal<ResumenDocumento | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Control del modal de afectación (trazabilidad de una línea). */
  protected readonly afectacionVisible = signal(false);
  /** Id del detalle base que consulta el modal de afectación (línea o su REF). */
  protected readonly afectacionDetalleId = signal<number | null>(null);

  /**
   * ¿Es editable el documento según su política declarativa (`canEditRow`)?
   * Misma fuente que la lista y el resolver de la ruta de edición.
   */
  protected readonly isEditable = computed(() => {
    const cab = this.cabecera();
    if (!cab) return false;
    const canEditRow = this.document().canEditRow;
    if (!canEditRow) return true;
    return canEditRow({ id: Number(this.id()), estado_aprobado: cab.estados.estado_aprobado });
  });

  /**
   * Qué acciones ofrece la botonera con las banderas actuales. La regla vive en
   * `documento.estado.ts` (módulo puro y testeado), no en los `[disabled]` del
   * template, que es donde el ERP anterior terminó contradiciéndose.
   */
  protected readonly capacidades = computed<CapacidadesDocumento>(() => {
    const cab = this.cabecera();
    return cab ? capacidadesDocumento(cab.estados) : CAPACIDADES_DOCUMENTO_VACIAS;
  });

  /** Resumen financiero del documento: subtotal, descuento, impuestos y total. */
  protected readonly resumen = computed<ResumenDocumento>(
    () => this.resumenCabecera() ?? calcularResumen(this.lines().map(toLineaCalculo)),
  );

  /** Migas: módulo Compra → listado del documento → identificador del documento abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() =>
    compraDocumentoBreadcrumb(
      this.t(),
      this.tenant.currentSlug(),
      this.i18n.translate(this.document().displayNameKey),
      this.document().id,
      `ID ${this.id() ?? ''}`,
    ),
  );

  ngOnInit(): void {
    const rawId = this.id();
    const id = rawId != null ? Number(rawId) : NaN;
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadDocumento(id);
  }

  protected onBack(): void {
    this.navigate(this.document().routes.list);
  }

  /** Clic en # de una línea: abre el modal de afectación (trazabilidad) de esa línea. */
  protected onVerAfectacion(detalleId: number): void {
    this.afectacionDetalleId.set(detalleId);
    this.afectacionVisible.set(true);
  }

  protected onEdit(): void {
    const id = this.id();
    if (!id) return;
    this.navigate(this.document().routes.edit, id);
  }

  protected onNew(): void {
    this.navigate(this.document().routes.new);
  }

  /**
   * La botonera cambió el estado del documento en el backend —lo aprobó,
   * desaprobó, anuló o (des)contabilizó—: se recarga la ficha para que la
   * cabecera (y la propia botonera, que lee de ella su estado) reflejen el nuevo.
   */
  protected onDocumentoChanged(): void {
    const id = this.id();
    if (!id) return;
    this.loadDocumento(Number(id));
  }

  private loadDocumento(id: number): void {
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      lineas: this.detalleService.paginaDeItems<ComercialDetalleRead>(id, 1),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas }) => {
          const read = cabecera as NotaAjusteRead;
          const na = notaAjusteToFormValue(read);
          this.cabecera.set({
            numero: read.numero ?? null,
            proveedor: read.contacto_nombre_corto ?? null,
            identificacion: read.contacto_numero_identificacion ?? null,
            fecha: na.fecha ?? null,
            documentoReferencia: read.documento_referencia_numero ?? null,
            plazoPago: read.plazo_pago_nombre ?? null,
            metodoPago: read.metodo_pago_nombre ?? null,
            conceptoCorreccion: read.documento_concepto_correccion_nombre ?? null,
            centroCosto: read.centro_costo_nombre ?? null,
            ordenCompra: read.orden_compra ?? null,
            cue: read.cue ?? null,
            comentario: read.comentario ?? null,
            estados: {
              estado_aprobado: read.estado_aprobado,
              estado_anulado: read.estado_anulado,
              estado_contabilizado: read.estado_contabilizado,
              estado_electronico: read.estado_electronico,
              estado_electronico_enviado: read.estado_electronico_enviado,
              estado_electronico_notificado: read.estado_electronico_notificado,
              estado_generado: read.estado_generado,
            },
          });
          this.resumenCabecera.set(resumenDesdeCabecera(read));
          this.pagina.set(0);
          this.totalItems.set(lineas.count);
          this.lines.set(lineas.results.map((line) => comercialDetalleToFormValue(line)));
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.notaAjuste.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  /** Fecha larga de la cabecera del documento (`05 de agosto de 2026`). */
  protected formatFecha(date: Date | null): string {
    return formatFechaLarga(date, '');
  }

  protected onItemsPageChange(event: PaginatorState): void {
    const id = this.id();
    const pagina = event.page ?? 0;
    if (!id || pagina === this.pagina()) return;
    this.cargandoItems.set(true);
    this.detalleService
      .paginaDeItems<ComercialDetalleRead>(Number(id), pagina + 1)
      .pipe(
        finalize(() => this.cargandoItems.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (items) => {
          this.pagina.set(pagina);
          this.totalItems.set(items.count);
          this.lines.set(items.results.map((line) => comercialDetalleToFormValue(line)));
        },
        error: () => {
          const toast = this.t().entities.comercialDetalle.toasts.loadError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  /** Navega dentro del tenant activo: `/t/<slug>/compra/<...routePath>[/extra]`. */
  private navigate(routePath: string, extra?: string): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const segments = routePath.split('/').filter(Boolean);
    const commands: (string | number)[] = ['/t', slug, 'compra', ...segments];
    if (extra) commands.push(extra);
    void this.router.navigate(commands);
  }
}
