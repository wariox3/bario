import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { type Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import {
  I18nService,
  TenantService,
  ToastService,
  calcularResumen,
  ErpSelectDataService,
  SELECT_ENDPOINTS,
  type DocumentoEstados,
  type ErpSelectOption,
  type ResumenDocumento,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, documentoBreadcrumb } from '@erp/core/erp-modules';
import { DocumentoDetalleService, ENTITY_DATA_GATEWAY } from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import type { AppDict } from '@erp/i18n';
import { ComercialDocumentoLineasTableComponent } from '@erp/features/documentos/comercial/components/comercial-documento-lineas-table/comercial-documento-lineas-table.component';
import { ComercialDocumentoResumenComponent } from '@erp/features/documentos/comercial/components/comercial-documento-resumen/comercial-documento-resumen.component';
import { DocumentDetailActionsComponent } from '@erp/core/module-config/components/document-detail-actions/document-detail-actions.component';
import { DocumentEstadosComponent } from '@erp/core/module-config/components/document-estados/document-estados.component';
import { AfectacionModalComponent } from '@erp/core/module-config/components/afectacion-modal/afectacion-modal.component';
import {
  comercialDetalleToFormValue,
  toLineaCalculo,
} from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import type { ComercialDetalleRead } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';
import { asesorLabel } from '../../factura-venta-recurrente.constants';
import type { FacturaVentaRecurrenteRead } from '../../factura-venta-recurrente.model';

/** Cabecera legible de la factura recurrente para la ficha (solo lo que trae `getById`). */
interface CabeceraView {
  readonly cliente: string | null;
  /** Identificación del cliente (`tercero_numero_identificacion` del read). */
  readonly identificacion: string | null;
  readonly plazoPago: string | null;
  readonly sede: string | null;
  readonly almacen: string | null;
  readonly metodoPago: string | null;
  /** Nombre corto del asesor, resuelto contra su catálogo (el read solo trae la FK). */
  readonly asesor: string | null;
  readonly comentario: string | null;
  /**
   * Banderas de estado (ciclo de vida) del documento. Alimentan los badges de la
   * ficha y la política de edición; la plantilla no se aprueba desde la ficha (el
   * backend no atiende esa acción para este tipo).
   */
  readonly estados: DocumentoEstados;
}

/**
 * Ficha (detalle) de una **Factura de venta recurrente** (familia comercial) —
 * solo lectura.
 *
 * Camino A del enfoque híbrido: la cabecera comercial es específica de cada
 * documento (de ahí que viva en `factura-venta-recurrente/` y no en un
 * `_shared`), pero la tabla de líneas y el resumen los aporta la familia
 * comercial. Carga cabecera (`ENTITY_DATA_GATEWAY.getById`) y líneas
 * (`DocumentoDetalleService`) en paralelo —igual que el form— y las muestra sin
 * formularios. Desde aquí se vuelve a la lista o se salta a editar.
 */
@Component({
  selector: 'app-factura-venta-recurrente-detail',
  standalone: true,
  imports: [
    ButtonModule,
    BreadcrumbComponent,
    ComercialDocumentoLineasTableComponent,
    ComercialDocumentoResumenComponent,
    DocumentDetailActionsComponent,
    DocumentEstadosComponent,
    AfectacionModalComponent,
  ],
  templateUrl: './factura-venta-recurrente-detail.component.html',
  styleUrl: './factura-venta-recurrente-detail.component.scss',
})
export class FacturaVentaRecurrenteDetailComponent implements OnInit {
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly selectData = inject(ErpSelectDataService);
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
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Control del modal de afectación (trazabilidad de una línea). */
  protected readonly afectacionVisible = signal(false);
  /** Id del detalle base que consulta el modal de afectación (línea o su REF). */
  protected readonly afectacionDetalleId = signal<number | null>(null);

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
    return canEditRow({ id: Number(this.id()), estado_aprobado: cab.estados.estado_aprobado });
  });

  /** Resumen financiero del documento: subtotal, descuento, impuestos y total. */
  protected readonly resumen = computed<ResumenDocumento>(() =>
    calcularResumen(this.lines().map(toLineaCalculo)),
  );

  /** Migas: módulo Venta → listado del documento → identificador del documento abierto. */
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

  private loadDocumento(id: number): void {
    // Mismo patrón que el form: cabecera y líneas son independientes → en paralelo.
    // Los nombres de los FK (plazo de pago, método de pago, sede) llegan en los
    // `*_nombre` del read; el del **asesor** no, así que su catálogo entra como
    // tercera pata del forkJoin (ver `cargarAsesores`).
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      lineas: this.detalleService.listarPorDocumento<ComercialDetalleRead>(id),
      asesores: this.cargarAsesores(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas, asesores }) => {
          const read = cabecera as FacturaVentaRecurrenteRead;
          this.cabecera.set({
            cliente: read.contacto_nombre ?? null,
            identificacion: read.tercero_numero_identificacion ?? null,
            plazoPago: read.plazo_pago_nombre ?? null,
            sede: read.sede_nombre ?? null,
            almacen: read.almacen_nombre ?? null,
            metodoPago: read.metodo_pago_nombre ?? null,
            asesor: read.asesor != null ? (asesores.get(read.asesor) ?? null) : null,
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
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.facturaVentaRecurrente.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  /**
   * Catálogo de asesores como `id → nombre corto`.
   *
   * El read del documento trae `asesor` (la FK) pero **no** `asesor_nombre_corto`,
   * a diferencia de plazo de pago, sede y método de pago, que sí traen su
   * etiqueta. Mientras el backend no lo serialice, la ficha resuelve el nombre
   * contra `asesor/seleccionar/`. Falla silenciosa a mapa vacío: quedarse sin el
   * nombre del asesor no puede tumbar la ficha entera.
   */
  private cargarAsesores(): Observable<Map<number, string>> {
    return this.selectData.fetchOptions(SELECT_ENDPOINTS.asesor).pipe(
      map((options) => new Map(options.map((o: ErpSelectOption) => [o.id, asesorLabel(o)]))),
      catchError(() => of(new Map<number, string>())),
    );
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
