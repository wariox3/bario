import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import {
  I18nService,
  TenantService,
  ToastService,
  extractErrorMessage,
  calcularResumen,
  type ResumenDocumento,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { compraDocumentoBreadcrumb } from '@erp/features/compra/shared/compra-breadcrumb';
import { DocumentoDetalleService, ENTITY_DATA_GATEWAY } from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import type { AppDict } from '@erp/i18n';
import { ComercialDocumentoLineasTableComponent } from '@erp/features/documentos/comercial/components/comercial-documento-lineas-table/comercial-documento-lineas-table.component';
import { ComercialDocumentoResumenComponent } from '@erp/features/documentos/comercial/components/comercial-documento-resumen/comercial-documento-resumen.component';
import { DocumentDetailActionsComponent } from '@erp/core/module-config/components/document-detail-actions/document-detail-actions.component';
import { AfectacionModalComponent } from '@erp/core/module-config/components/afectacion-modal/afectacion-modal.component';
import {
  comercialDetalleToFormValue,
  toLineaCalculo,
} from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import type { ComercialDetalleRead } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';
import { notaCreditoCompraToFormValue } from '../../nota-credito-compra.mapper';
import type { NotaCreditoCompraRead } from '../../nota-credito-compra.model';

/** Cabecera legible de la nota crédito para la ficha (solo lo que trae `getById`). */
interface CabeceraView {
  readonly numero: string | null;
  readonly proveedor: string | null;
  readonly fecha: Date | null;
  readonly documentoReferencia: string | null;
  readonly centroCosto: string | null;
  readonly comentario: string | null;
  /** Si ya está aprobado no se puede volver a aprobar (deshabilita la acción). */
  readonly estadoAprobado: boolean;
}

/**
 * Ficha (detalle) de una **Nota crédito de compra** (familia comercial) — solo
 * lectura.
 *
 * Carga cabecera (`ENTITY_DATA_GATEWAY.getById`) y líneas (`DocumentoDetalleService`)
 * en paralelo —igual que el form— y las muestra sin formularios. Desde aquí se
 * vuelve a la lista o se salta a editar.
 */
@Component({
  selector: 'app-nota-credito-compra-detail',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    BreadcrumbComponent,
    ComercialDocumentoLineasTableComponent,
    ComercialDocumentoResumenComponent,
    DocumentDetailActionsComponent,
    AfectacionModalComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './nota-credito-compra-detail.component.html',
  styleUrl: './nota-credito-compra-detail.component.scss',
})
export class NotaCreditoCompraDetailComponent implements OnInit {
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmation = inject(ConfirmationService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Documento activo inyectado por `activeDocumentResolver` vía router binding. */
  readonly document = input.required<DocumentEntityConfig>();

  /** Id del documento (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly cabecera = signal<CabeceraView | null>(null);
  /** Líneas del documento, ya mapeadas a la forma del front para alimentar la tabla. */
  protected readonly lines = signal<readonly ComercialDetalleFormRawValue[]>([]);
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
    return canEditRow({ id: Number(this.id()), estado_aprobado: cab.estadoAprobado });
  });

  /** Resumen financiero del documento: subtotal, descuento, impuestos y total. */
  protected readonly resumen = computed<ResumenDocumento>(() =>
    calcularResumen(this.lines().map(toLineaCalculo)),
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

  /** Aprueba el documento previa confirmación; al éxito recarga la ficha. */
  protected onAprobar(): void {
    const id = this.id();
    if (!id) return;
    const a = this.t().documentActions.detail;
    this.confirmation.confirm({
      message: a.confirmAprobar.message,
      header: a.confirmAprobar.header,
      icon: 'pi pi-check-circle',
      acceptLabel: a.aprobar,
      rejectLabel: this.t().common.actions.cancel,
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.aprobarDocumento(Number(id)),
    });
  }

  private aprobarDocumento(id: number): void {
    this.gateway
      .aprobar(this.document(), id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const ts = this.t().documentActions.detail.toasts.aprobarSuccess;
          this.toast.success(ts.title, ts.desc);
          this.loadDocumento(id);
        },
        error: (err: unknown) => {
          const ts = this.t().documentActions.detail.toasts.aprobarError;
          this.toast.error(ts.title, extractErrorMessage(err, ts.desc));
        },
      });
  }

  /** Desaprueba el documento previa confirmación; al éxito recarga la ficha. */
  protected onDesaprobar(): void {
    const id = this.id();
    if (!id) return;
    const a = this.t().documentActions.detail;
    this.confirmation.confirm({
      message: a.confirmDesaprobar.message,
      header: a.confirmDesaprobar.header,
      icon: 'pi pi-times-circle',
      acceptLabel: a.desaprobar,
      rejectLabel: this.t().common.actions.cancel,
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.desaprobarDocumento(Number(id)),
    });
  }

  private desaprobarDocumento(id: number): void {
    this.gateway
      .desaprobar(this.document(), id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const ts = this.t().documentActions.detail.toasts.desaprobarSuccess;
          this.toast.success(ts.title, ts.desc);
          this.loadDocumento(id);
        },
        error: (err: unknown) => {
          const ts = this.t().documentActions.detail.toasts.desaprobarError;
          this.toast.error(ts.title, extractErrorMessage(err, ts.desc));
        },
      });
  }

  /** Descarga el PDF del documento. */
  protected onImprimir(): void {
    const id = this.id();
    if (!id) return;
    this.gateway
      .imprimir(this.document(), Number(id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          const ts = this.t().documentActions.detail.toasts.imprimirError;
          this.toast.error(ts.title, ts.desc);
        },
      });
  }

  protected onArchivos(): void {
    this.toast.info(this.t().common.comingSoon);
  }

  private loadDocumento(id: number): void {
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      lineas: this.detalleService.listarPorDocumento<ComercialDetalleRead>(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas }) => {
          const read = cabecera as NotaCreditoCompraRead;
          const nc = notaCreditoCompraToFormValue(read);
          this.cabecera.set({
            numero: read.numero ?? null,
            proveedor: nc.contacto?.nombre ?? read.contacto_nombre ?? null,
            fecha: nc.fecha ?? null,
            documentoReferencia: read.documento_referencia_numero ?? null,
            centroCosto: read.centro_costo_nombre ?? null,
            comentario: read.comentario ?? null,
            estadoAprobado: read.estado_aprobado,
          });
          this.lines.set(lineas.map((line) => comercialDetalleToFormValue(line)));
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.notaCreditoCompra.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  /** Fecha larga de la cabecera (`20 de junio de 2026`). */
  protected formatFecha(date: Date | null): string {
    if (!date) return '—';
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
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
