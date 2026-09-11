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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, type MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import {
  I18nService,
  TenantService,
  ToastService,
  extractErrorMessage,
  formatFechaLarga,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { inventarioDocumentoBreadcrumb } from '@erp/features/inventario/shared/inventario-breadcrumb';
import { DocumentoDetalleService, ENTITY_DATA_GATEWAY } from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import type { AppDict } from '@erp/i18n';
import { DocumentDetailActionsComponent } from '@erp/core/module-config/components/document-detail-actions/document-detail-actions.component';
import { ImportDialogComponent } from '@erp/core/components/import-dialog/import-dialog.component';
import { importState } from '@erp/core/components/import-dialog/import-state';
import type { ExampleConfig } from '@erp/core/components/import-dialog/import-dialog.types';
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
import { usaOperacionInventario } from '../../movimiento-documento.constants';
import { movimientoToFormValue } from '../../movimiento-documento.mapper';
import type { MovimientoRead } from '../../movimiento-documento.model';

/** Cabecera legible del movimiento para la ficha (solo lo que trae `getById`). */
interface CabeceraView {
  readonly numero: string | null;
  readonly contacto: string | null;
  /** Identificación del contacto (`contacto_numero_identificacion` del read). */
  readonly identificacion: string | null;
  readonly almacen: string | null;
  readonly fecha: Date | null;
  readonly comentario: string | null;
  /** Si ya está aprobada no se puede volver a aprobar (deshabilita la acción). */
  readonly estadoAprobado: boolean;
}

/**
 * Ficha (detalle) de un **movimiento de inventario** — solo lectura.
 *
 * Página **compartida** por los documentos de la familia (entrada, salida y
 * traslado): el nombre del documento sale de la config, no de un literal i18n.
 *
 * Carga cabecera (`ENTITY_DATA_GATEWAY.getById`) y líneas (`DocumentoDetalleService`)
 * en paralelo —igual que el form— y las muestra sin formularios. Desde aquí se
 * vuelve a la lista, se salta a editar o se aprueba/desaprueba el documento.
 *
 * Suma un dropdown **Utilidades** con la importación de líneas por Excel, igual
 * que la ficha del asiento. Vive acá y no en el formulario —donde lo tenía el
 * legacy— porque la importación necesita un documento ya creado: el backend
 * recibe el id del padre, y la ficha es el único lugar donde siempre lo hay.
 */
@Component({
  selector: 'app-movimiento-documento-detail',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    BreadcrumbComponent,
    InventarioDocumentoLineasTableComponent,
    InventarioDocumentoResumenComponent,
    DocumentDetailActionsComponent,
    MenuModule,
    ImportDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './movimiento-documento-detail.component.html',
  styleUrl: './movimiento-documento-detail.component.scss',
})
export class MovimientoDocumentoDetailComponent implements OnInit {
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

  /** ¿Se muestra el sentido del movimiento por línea? Solo en el traslado. */
  protected readonly showOperacion = computed(() => usaOperacionInventario(this.document().id));

  private readonly utilidadesMenu = viewChild<Menu>('utilidadesMenu');

  /**
   * Entradas del dropdown "Utilidades". `computed` porque recrear el array en
   * cada detección de cambios le hace perder el primer click a `p-menu`.
   *
   * Importar se deshabilita sobre un documento no editable —aprobado,
   * típicamente— porque el backend responde 400 en ese caso: mejor decirlo en el
   * menú que dejar que el usuario elija un archivo para nada.
   */
  protected readonly utilidadesItems = computed<MenuItem[]>(() => [
    {
      label: this.t().entities.movimientoInventario.utilidades.importarDetalle,
      icon: 'pi pi-upload',
      disabled: !this.isEditable(),
      command: () => this.importar.open(),
    },
  ]);

  /**
   * Plantilla de importación de líneas. El endpoint es el genérico de
   * `documento-detalle`, pero el `documento` no es decorativo: el backend arma
   * las columnas según el tipo del padre, así que la misma llamada devuelve la
   * plantilla de la entrada, la salida o el traslado sin que el front elija.
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

  protected toggleUtilidades(event: Event): void {
    this.utilidadesMenu()?.toggle(event);
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

  private loadDocumento(id: number): void {
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      lineas: this.detalleService.listarPorDocumento<InventarioDetalleRead>(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas }) => {
          const read = cabecera as MovimientoRead;
          const form = movimientoToFormValue(read);
          this.cabecera.set({
            numero: read.numero ?? null,
            contacto: read.contacto_nombre_corto ?? null,
            identificacion: read.contacto_numero_identificacion ?? null,
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
          const toasts = this.t().entities.movimientoInventario.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  /** Fecha larga de la cabecera del documento (`05 de agosto de 2026`). */
  protected formatFecha(date: Date | null): string {
    return formatFechaLarga(date, '—');
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
