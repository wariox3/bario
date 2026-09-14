import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { I18nService, TenantService, ToastService, formatFechaLarga } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, documentoBreadcrumb } from '@erp/core/erp-modules';
import { DocumentoDetalleService, ENTITY_DATA_GATEWAY } from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import { DocumentDetailActionsComponent } from '@erp/core/module-config/components/document-detail-actions/document-detail-actions.component';
import type { AppDict } from '@erp/i18n';
import { ContableDocumentoLineasTableComponent } from '@erp/features/documentos/contable/components/contable-documento-lineas-table/contable-documento-lineas-table.component';
import { ContableDocumentoResumenComponent } from '@erp/features/documentos/contable/components/contable-documento-resumen/contable-documento-resumen.component';
import {
  calcularResumenContable,
  cuentaDetalleToFormValue,
} from '@erp/features/documentos/contable/contable-documento-detalle.mapper';
import type { CuentaDetalleRead } from '@erp/features/documentos/contable/contable-documento-detalle.model';
import type {
  CuentaDetalleFormRawValue,
  ResumenContable,
} from '@erp/features/documentos/contable/contable-documento-detalle.types';
import { pagoToFormValue } from '../../pago.mapper';
import type { PagoRead } from '../../pago.model';

/** Cabecera legible del pago para la ficha (solo lo que trae `getById`). */
interface CabeceraView {
  readonly numero: string | null;
  readonly cliente: string | null;
  /** Identificación del contacto (`contacto_numero_identificacion` del read). */
  readonly identificacion: string | null;
  readonly fecha: Date | null;
  readonly cuentaBanco: string | null;
  readonly comentario: string | null;
  /** Si ya está aprobado no se puede volver a aprobar (deshabilita la acción). */
  readonly estadoAprobado: boolean;
  /** Gobierna qué ofrece el diálogo "Contabilidad": contabilizar o descontabilizar. */
  readonly estadoContabilizado: boolean;
}

/**
 * Ficha (detalle) de un **Pago** (recaudo de cartera) — solo lectura.
 *
 * Espeja `FacturaCompraDetailComponent` pero sobre la familia **contable**: la
 * cabecera del recaudo es corta (cliente, fecha, cuenta banco, comentario) y las
 * líneas son asientos —cuenta + naturaleza + valor, con contacto y centro de
 * costo—, así que compone la tabla contable read-only y su resumen (débitos,
 * créditos y el neto que es el recaudo). Carga cabecera (`ENTITY_DATA_GATEWAY`)
 * y líneas (`DocumentoDetalleService`) en paralelo, igual que el form. Desde aquí
 * se vuelve a la lista o se salta a editar.
 */
@Component({
  selector: 'app-pago-detail',
  standalone: true,
  imports: [
    ButtonModule,
    BreadcrumbComponent,
    ContableDocumentoLineasTableComponent,
    ContableDocumentoResumenComponent,
    DocumentDetailActionsComponent,
    TabsModule,
  ],
  templateUrl: './pago-detail.component.html',
  styleUrl: './pago-detail.component.scss',
})
export class PagoDetailComponent implements OnInit {
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Documento activo inyectado por `activeDocumentResolver` vía router binding. */
  readonly document = input.required<DocumentEntityConfig>();

  /** Id del documento (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly cabecera = signal<CabeceraView | null>(null);
  /** Líneas del documento, ya mapeadas a la forma del front para alimentar la tabla. */
  protected readonly lines = signal<readonly CuentaDetalleFormRawValue[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /**
   * ¿Es editable el documento según su política declarativa (`canEditRow`)?
   * Misma fuente que la lista y el resolver de la ruta de edición: si la regla
   * dice que no (p. ej. ya aprobado), el botón "editar" queda deshabilitado.
   */
  protected readonly isEditable = computed(() => {
    const cab = this.cabecera();
    if (!cab) return false;
    const canEditRow = this.document().canEditRow;
    if (!canEditRow) return true;
    return canEditRow({ id: Number(this.id()), estado_aprobado: cab.estadoAprobado });
  });

  /** Resumen contable del recaudo: débitos, créditos y neto. */
  protected readonly resumen = computed<ResumenContable>(() =>
    calcularResumenContable(this.lines()),
  );

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
    // Mismo patrón que el form: cabecera y líneas son independientes → en paralelo.
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      lineas: this.detalleService.listarPorDocumento<CuentaDetalleRead>(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas }) => {
          const read = cabecera as PagoRead;
          const pv = pagoToFormValue(read);
          this.cabecera.set({
            numero: read.numero ?? null,
            cliente: read.contacto_nombre_corto ?? null,
            identificacion: read.contacto_numero_identificacion ?? null,
            fecha: pv.fecha ?? null,
            cuentaBanco: pv.cuenta_banco?.nombre ?? read.cuenta_banco_nombre ?? null,
            comentario: read.comentario ?? null,
            estadoAprobado: read.estado_aprobado,
            estadoContabilizado: read.estado_contabilizado ?? false,
          });
          this.lines.set(lineas.map((line) => cuentaDetalleToFormValue(line)));
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.pago.form.toasts;
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
