import {
  Component,
  DestroyRef,
  type OnInit,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import type { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
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
import { ImportDialogComponent } from '@erp/core/components/import-dialog/import-dialog.component';
import { importState } from '@erp/core/components/import-dialog/import-state';
import type { ExampleConfig } from '@erp/core/components/import-dialog/import-dialog.types';
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
import { facturaVentaToFormValue } from '../../factura-venta.mapper';
import type { FacturaVentaRead } from '../../factura-venta.model';

/** Cabecera legible de la factura para la ficha (solo lo que trae `getById`). */
interface CabeceraView {
  readonly numero: string | null;
  readonly cliente: string | null;
  /** Identificación del contacto (`contacto_numero_identificacion` del read). */
  readonly identificacion: string | null;
  readonly fecha: Date | null;
  readonly fechaVence: Date | null;
  readonly plazoPago: string | null;
  readonly sede: string | null;
  readonly metodoPago: string | null;
  /**
   * Banderas de estado (ciclo de vida) del documento. Alimentan los badges de la
   * ficha y las acciones de la botonera (p. ej. no se re-aprueba lo ya aprobado).
   */
  readonly estados: DocumentoEstados;
}

/**
 * Ficha (detalle) de una **Factura de venta** (familia comercial) — solo lectura.
 *
 * Camino A del enfoque híbrido: la cabecera comercial es específica de cada
 * documento (de ahí que viva en `factura-venta/` y no en un `_shared`), pero la
 * tabla de líneas y el resumen los aporta la familia comercial. Carga cabecera
 * (`ENTITY_DATA_GATEWAY.getById`) y líneas (`DocumentoDetalleService`) en paralelo
 * —igual que el form— y las muestra sin formularios. Desde aquí se vuelve a la
 * lista o se salta a editar. Líneas y pagos van en tabs dentro de la card de la
 * cabecera, con un único resumen debajo: el mismo esqueleto que el formulario.
 *
 * Suma un dropdown **Utilidades** con la importación de líneas por Excel, igual
 * que la ficha del asiento. Vive acá y no en el formulario porque la
 * importación necesita un documento ya creado —el backend recibe el id del
 * padre— y la ficha es el único lugar donde siempre lo hay.
 */
@Component({
  selector: 'app-factura-venta-detail',
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
    MenuModule,
    TabsModule,
    ImportDialogComponent,
  ],
  templateUrl: './factura-venta-detail.component.html',
  styleUrl: './factura-venta-detail.component.scss',
})
export class FacturaVentaDetailComponent implements OnInit {
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

  private readonly utilidadesMenu = viewChild<Menu>('utilidadesMenu');

  /**
   * Entradas del dropdown "Utilidades". `computed` porque recrear el array en
   * cada detección de cambios le hace perder el primer click a `p-menu`.
   *
   * Importar se deshabilita sobre una factura no editable —aprobada,
   * típicamente— porque el backend responde 400 en ese caso: mejor decirlo en el
   * menú que dejar que el usuario elija un archivo para nada.
   */
  protected readonly utilidadesItems = computed<MenuItem[]>(() => [
    {
      label: this.t().entities.facturaVenta.utilidades.importarDetalle,
      icon: 'pi pi-upload',
      disabled: !this.isEditable(),
      command: () => this.importar.open(),
    },
  ]);

  /**
   * Plantilla de importación de líneas. El endpoint es el genérico de
   * `documento-detalle`, pero el `documento` no es decorativo: el backend arma
   * las columnas según el tipo del padre, así que sin él no hay plantilla.
   */
  protected readonly exampleConfig = computed<ExampleConfig>(() => ({
    mode: 'enabled',
    endpoint: this.detalleService.importarEjemploEndpoint,
    params: { documento: this.id() },
    filename: `detalle-${this.document().id}.xlsx`,
  }));

  /**
   * Estado del diálogo de importación de líneas. Al terminar recarga la ficha
   * entera y no solo las líneas: el backend recalcula los totales del documento
   * al cerrar la importación, así que la cabecera también quedó vieja.
   */
  protected readonly importar = importState({
    upload: (file) => this.detalleService.importar(Number(this.id()), file),
    onImported: () => this.loadDocumento(Number(this.id())),
  });

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

  protected toggleUtilidades(event: Event): void {
    this.utilidadesMenu()?.toggle(event);
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
    // Los nombres de los FK (plazo de pago, método de pago, sede) llegan en los
    // `*_nombre` del read; no hace falta resolverlos con peticiones extra.
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      lineas: this.detalleService.listarPorDocumento<ComercialDetalleRead>(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas }) => {
          const read = cabecera as FacturaVentaRead;
          const fv = facturaVentaToFormValue(read);
          this.cabecera.set({
            numero: read.numero ?? null,
            cliente: read.contacto_nombre_corto ?? null,
            identificacion: read.contacto_numero_identificacion ?? null,
            fecha: fv.fecha ?? null,
            fechaVence: fv.fecha_vence ?? null,
            plazoPago: read.plazo_pago_nombre ?? null,
            sede: read.sede_nombre ?? null,
            metodoPago: read.metodo_pago_nombre ?? null,
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
          this.pagos.set((read.pagos ?? []).map(pagoReadToFormValue));
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.facturaVenta.form.toasts;
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
