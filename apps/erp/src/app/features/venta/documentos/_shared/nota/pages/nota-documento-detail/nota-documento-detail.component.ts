import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import {
  formatFechaLarga,
  I18nService,
  TenantService,
  ToastService,
  calcularResumen,
  type DocumentoEstados,
  type ResumenDocumento,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, documentoBreadcrumb } from '@erp/core/erp-modules';
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
import {
  comercialDetalleToFormValue,
  toLineaCalculo,
  totalCantidad,
} from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import { DocumentoPagosTableComponent } from '@erp/features/documentos/pagos/components/documento-pagos-table/documento-pagos-table.component';
import { calcularPagos } from '@erp/features/documentos/pagos/pago.calculo';
import type { PagoFormRawValue } from '@erp/features/documentos/pagos/pago.form';
import { pagoReadToFormValue } from '@erp/features/documentos/pagos/pago.mapper';
import type { ComercialDetalleRead } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';
import { notaVentaToFormValue } from '../../nota-documento.mapper';
import type { NotaVentaRead } from '../../nota-documento.model';

/** Cabecera legible de la nota de venta para la ficha (solo lo que trae `getById`). */
interface CabeceraView {
  readonly numero: string | null;
  readonly cliente: string | null;
  /** Identificación del contacto (`contacto_numero_identificacion` del read). */
  readonly identificacion: string | null;
  readonly fecha: Date | null;
  readonly documentoReferencia: string | null;
  readonly sede: string | null;
  readonly metodoPago: string | null;
  readonly comentario: string | null;
  /**
   * Banderas de estado (ciclo de vida) del documento. Alimentan los badges de la
   * ficha y las acciones de la botonera (p. ej. no se re-aprueba lo ya aprobado).
   */
  readonly estados: DocumentoEstados;
}

/**
 * Ficha (detalle) de una **nota de venta** — solo lectura. La comparten la nota
 * crédito y la nota débito: la cabecera es idéntica entre ellas y el documento
 * concreto lo aporta el `DocumentEntityConfig` inyectado por
 * `activeDocumentResolver`.
 *
 * Camino A del enfoque híbrido: la tabla de líneas y el resumen los aporta la
 * familia comercial. Carga cabecera (`ENTITY_DATA_GATEWAY.getById`) y líneas
 * (`DocumentoDetalleService`) en paralelo —igual que el form— y las muestra sin
 * formularios. Líneas y pagos van en tabs dentro de la card de la cabecera, con
 * un único resumen debajo: el mismo esqueleto que el formulario. La pestaña de
 * pagos solo aparece si la config declara `hasPagos` (la nota crédito sí, la
 * débito no). Desde aquí se
 * vuelve a la lista o se edita.
 */
@Component({
  selector: 'app-nota-documento-detail',
  standalone: true,
  imports: [
    ButtonModule,
    BreadcrumbComponent,
    ComercialDocumentoLineasTableComponent,
    ComercialDocumentoResumenComponent,
    DocumentoPagosTableComponent,
    DocumentDetailActionsComponent,
    DocumentEstadosComponent,
    AfectacionModalComponent,
    TabsModule,
  ],
  templateUrl: './nota-documento-detail.component.html',
  styleUrl: './nota-documento-detail.component.scss',
})
export class NotaDocumentoDetailComponent implements OnInit {
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
  protected readonly lines = signal<readonly ComercialDetalleFormRawValue[]>([]);
  /** Pagos recibidos, mapeados a la forma del front (asunción de contrato: el backend aún no los expone). */
  protected readonly pagos = signal<readonly PagoFormRawValue[]>([]);
  /** ¿Se cobra en el acto? Lo declara la config (`hasPagos`); sin él no hay pestaña de pagos. */
  protected readonly conPagos = computed(() => this.document().hasPagos === true);
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
  protected readonly resumen = computed<ResumenDocumento>(() =>
    calcularResumen(this.lines().map(toLineaCalculo)),
  );

  /** Suma de cantidades de las líneas (fila «Total cantidad» del resumen). */
  protected readonly cantidadTotal = computed(() => totalCantidad(this.lines()));

  /** Recibido, saldo y exceso de los pagos frente al total: misma función que el formulario. */
  protected readonly pagosResumen = computed(() =>
    calcularPagos(this.pagos(), this.resumen().total),
  );

  /** Migas: módulo → listado del documento → identificador del documento abierto. */
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
      lineas: this.detalleService.listarPorDocumento<ComercialDetalleRead>(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas }) => {
          const read = cabecera as NotaVentaRead;
          const fv = notaVentaToFormValue(read);
          this.cabecera.set({
            numero: read.numero ?? null,
            cliente: read.contacto_nombre_corto ?? null,
            identificacion: read.contacto_numero_identificacion ?? null,
            fecha: fv.fecha ?? null,
            documentoReferencia: read.documento_referencia_numero ?? null,
            sede: read.sede_nombre ?? null,
            metodoPago: read.metodo_pago_nombre ?? null,
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
          this.lines.set(lineas.map((line) => comercialDetalleToFormValue(line)));
          this.pagos.set(this.conPagos() ? (read.pagos ?? []).map(pagoReadToFormValue) : []);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.notaVenta.form.toasts;
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
