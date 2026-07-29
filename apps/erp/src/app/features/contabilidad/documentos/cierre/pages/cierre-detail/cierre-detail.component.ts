import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { PaginatorModule, type PaginatorState } from 'primeng/paginator';
import { I18nService, TenantService, ToastService, extractErrorMessage } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, documentoBreadcrumb } from '@erp/core/erp-modules';
import { DocumentoDetalleService, ENTITY_DATA_GATEWAY } from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import { DocumentDetailActionsComponent } from '@erp/core/module-config/components/document-detail-actions/document-detail-actions.component';
import type { AppDict } from '@erp/i18n';
import { ContableDocumentoLineasTableComponent } from '@erp/features/documentos/contable/components/contable-documento-lineas-table/contable-documento-lineas-table.component';
import { cuentaDetalleToFormValue } from '@erp/features/documentos/contable/contable-documento-detalle.mapper';
import type { CuentaDetalleRead } from '@erp/features/documentos/contable/contable-documento-detalle.model';
import type { CuentaDetalleFormRawValue } from '@erp/features/documentos/contable/contable-documento-detalle.types';
import { CIERRE_DETALLE_PAGE_SIZE } from '../../cierre.constants';
import { cierreToFormValue } from '../../cierre.mapper';
import type { CierreRead } from '../../cierre.model';

/** Cabecera legible del cierre para la ficha (solo lo que trae `getById`). */
interface CabeceraView {
  readonly numero: string | null;
  readonly contacto: string | null;
  readonly fecha: Date | null;
  readonly grupo: string | null;
  readonly comentario: string | null;
  /** Si ya está aprobado no se puede volver a aprobar (deshabilita la acción). */
  readonly estadoAprobado: boolean;
}

/**
 * Ficha (detalle) de un **Cierre contable** — solo lectura.
 *
 * Pinta las mismas líneas paginadas que el formulario pero sin las acciones que
 * las regeneran o borran: eso es trabajo de la edición.
 *
 * A diferencia de sus hermanos, cabecera y líneas **no** se piden en paralelo con
 * un `forkJoin`: las líneas paginan, así que se recargan solas cada vez que
 * cambia la página.
 */
@Component({
  selector: 'app-cierre-detail',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    PaginatorModule,
    BreadcrumbComponent,
    ContableDocumentoLineasTableComponent,
    DocumentDetailActionsComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './cierre-detail.component.html',
  styleUrl: './cierre-detail.component.scss',
})
export class CierreDetailComponent implements OnInit {
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmation = inject(ConfirmationService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly pageSize = CIERRE_DETALLE_PAGE_SIZE;

  /** Documento activo inyectado por `activeDocumentResolver` vía router binding. */
  readonly document = input.required<DocumentEntityConfig>();

  /** Id del documento (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly cabecera = signal<CabeceraView | null>(null);
  protected readonly lines = signal<readonly CuentaDetalleFormRawValue[]>([]);
  protected readonly page = signal(0);
  protected readonly totalLineas = signal(0);
  protected readonly isLoading = signal(true);
  protected readonly isLoadingLineas = signal(false);
  protected readonly notFound = signal(false);

  /** ¿Es editable el documento según su política declarativa (`canEditRow`)? */
  protected readonly isEditable = computed(() => {
    const cab = this.cabecera();
    if (!cab) return false;
    const canEditRow = this.document().canEditRow;
    if (!canEditRow) return true;
    return canEditRow({ id: Number(this.id()), estado_aprobado: cab.estadoAprobado });
  });

  /** Migas: módulo activo → listado del documento → identificador del documento abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() =>
    documentoBreadcrumb(
      this.activeModule,
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
    this.loadCabecera(id);
    this.loadLineas(id);
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
          this.loadCabecera(id);
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
          this.loadCabecera(id);
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

  protected onPageChange(event: PaginatorState): void {
    const id = this.id();
    if (!id) return;
    this.page.set(event.page ?? 0);
    this.loadLineas(Number(id));
  }

  private loadCabecera(id: number): void {
    this.gateway
      .getById(this.document(), id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cabecera) => {
          const read = cabecera as CierreRead;
          const fv = cierreToFormValue(read);
          this.cabecera.set({
            numero: read.numero ?? null,
            contacto: fv.contacto?.nombre ?? read.contacto_nombre ?? null,
            fecha: fv.fecha ?? null,
            grupo: fv.grupo_contabilidad?.nombre ?? read.grupo_contabilidad_nombre ?? null,
            comentario: read.comentario ?? null,
            estadoAprobado: read.estado_aprobado,
          });
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.cierre.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private loadLineas(id: number): void {
    this.isLoadingLineas.set(true);
    this.detalleService
      .listarPaginadoPorDocumento<CuentaDetalleRead>(id, this.page() + 1, this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isLoadingLineas.set(false);
          this.totalLineas.set(res.count);
          this.lines.set(res.results.map(cuentaDetalleToFormValue));
        },
        error: () => {
          this.isLoadingLineas.set(false);
          const toasts = this.t().entities.cierre.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  /** Fecha larga de la cabecera (`31 de diciembre de 2026`). */
  protected formatFecha(date: Date | null): string {
    if (!date) return '—';
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  /** Navega dentro del tenant y módulo activos: `/t/<slug>/<modulo>/<...routePath>[/extra]`. */
  private navigate(routePath: string, extra?: string): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const segments = routePath.split('/').filter(Boolean);
    const commands: (string | number)[] = [
      '/t',
      slug,
      currentModuleId(this.activeModule),
      ...segments,
    ];
    if (extra) commands.push(extra);
    void this.router.navigate(commands);
  }
}
