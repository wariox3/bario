import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, type PaginatorState } from 'primeng/paginator';
import { I18nService, TenantService, ToastService, formatFechaLarga } from '@reddoc/core';
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
  /** Identificación del contacto (`contacto_numero_identificacion` del read). */
  readonly identificacion: string | null;
  readonly fecha: Date | null;
  readonly centroCosto: string | null;
  readonly comentario: string | null;
  /** Si ya está aprobado no se puede volver a aprobar (deshabilita la acción). */
  readonly estadoAprobado: boolean;
  /** Gobierna qué ofrece el diálogo "Contabilidad": contabilizar o descontabilizar. */
  readonly estadoContabilizado: boolean;
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
    PaginatorModule,
    BreadcrumbComponent,
    ContableDocumentoLineasTableComponent,
    DocumentDetailActionsComponent,
  ],
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

  /**
   * La botonera cambió el estado del documento en el backend —lo aprobó,
   * desaprobó, anuló o (des)contabilizó—: se recarga la ficha para que la
   * cabecera (y la propia botonera, que lee de ella su estado) reflejen el nuevo.
   */
  protected onDocumentoChanged(): void {
    const id = this.id();
    if (!id) return;
    this.loadCabecera(Number(id));
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
            contacto: read.contacto_nombre_corto ?? null,
            identificacion: read.contacto_numero_identificacion ?? null,
            fecha: fv.fecha ?? null,
            centroCosto: fv.centro_costo?.nombre ?? read.centro_costo_nombre ?? null,
            comentario: read.comentario ?? null,
            estadoAprobado: read.estado_aprobado,
            estadoContabilizado: read.estado_contabilizado ?? false,
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

  /** Fecha larga de la cabecera del documento (`05 de agosto de 2026`). */
  protected formatFecha(date: Date | null): string {
    return formatFechaLarga(date, '—');
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
