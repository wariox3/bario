import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { I18nService, TenantService, ToastService, extractErrorMessage } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { inventarioDocumentoBreadcrumb } from '@erp/features/inventario/shared/inventario-breadcrumb';
import { DocumentoDetalleService, ENTITY_DATA_GATEWAY } from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import type { AppDict } from '@erp/i18n';
import { DocumentDetailActionsComponent } from '@erp/core/module-config/components/document-detail-actions/document-detail-actions.component';
import { InventarioDocumentoLineasTableComponent } from '@erp/features/documentos/inventario/components/inventario-documento-lineas-table/inventario-documento-lineas-table.component';
import { InventarioDocumentoResumenComponent } from '@erp/features/documentos/inventario/components/inventario-documento-resumen/inventario-documento-resumen.component';
import {
  inventarioDetalleToFormValue,
  resumenInventario,
} from '@erp/features/documentos/inventario/inventario-documento-detalle.mapper';
import type { InventarioDetalleRead } from '@erp/features/documentos/inventario/inventario-documento-detalle.model';
import type {
  InventarioDetalleFormRawValue,
  ResumenInventario,
} from '@erp/features/documentos/inventario/inventario-documento-detalle.types';
import { entradaToFormValue } from '../../entrada.mapper';
import type { EntradaRead } from '../../entrada.model';

/** Cabecera legible de la entrada para la ficha (solo lo que trae `getById`). */
interface CabeceraView {
  readonly numero: string | null;
  readonly contacto: string | null;
  readonly almacen: string | null;
  readonly fecha: Date | null;
  readonly comentario: string | null;
  /** Si ya está aprobada no se puede volver a aprobar (deshabilita la acción). */
  readonly estadoAprobado: boolean;
}

/**
 * Ficha (detalle) de una **Entrada de almacén** (familia inventario) — solo lectura.
 *
 * Carga cabecera (`ENTITY_DATA_GATEWAY.getById`) y líneas (`DocumentoDetalleService`)
 * en paralelo —igual que el form— y las muestra sin formularios. Desde aquí se
 * vuelve a la lista, se salta a editar o se aprueba/desaprueba el documento.
 */
@Component({
  selector: 'app-entrada-detail',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    BreadcrumbComponent,
    InventarioDocumentoLineasTableComponent,
    InventarioDocumentoResumenComponent,
    DocumentDetailActionsComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './entrada-detail.component.html',
  styleUrl: './entrada-detail.component.scss',
})
export class EntradaDetailComponent implements OnInit {
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
  protected readonly lines = signal<readonly InventarioDetalleFormRawValue[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

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

  /** Totales del documento: cantidad acumulada, subtotal y total. */
  protected readonly resumen = computed<ResumenInventario>(() => resumenInventario(this.lines()));

  /** Migas: módulo Inventario → listado del documento → identificador del abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() =>
    inventarioDocumentoBreadcrumb(
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
      lineas: this.detalleService.listarPorDocumento<InventarioDetalleRead>(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas }) => {
          const read = cabecera as EntradaRead;
          const form = entradaToFormValue(read);
          this.cabecera.set({
            numero: read.numero ?? null,
            contacto: form.contacto?.nombre ?? read.contacto_nombre ?? null,
            almacen: form.almacen?.nombre ?? read.almacen_nombre ?? null,
            fecha: form.fecha ?? null,
            comentario: read.comentario ?? null,
            estadoAprobado: read.estado_aprobado,
          });
          this.lines.set(lineas.map((line) => inventarioDetalleToFormValue(line)));
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.entrada.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  /** Fecha larga de la cabecera (`20 de junio de 2026`). */
  protected formatFecha(date: Date | null): string {
    if (!date) return '—';
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  /** Navega dentro del tenant activo: `/t/<slug>/inventario/<...routePath>[/extra]`. */
  private navigate(routePath: string, extra?: string): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const segments = routePath.split('/').filter(Boolean);
    const commands: (string | number)[] = ['/t', slug, 'inventario', ...segments];
    if (extra) commands.push(extra);
    void this.router.navigate(commands);
  }
}
