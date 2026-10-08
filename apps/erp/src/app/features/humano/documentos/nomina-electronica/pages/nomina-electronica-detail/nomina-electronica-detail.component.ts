import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import {
  formatFechaCorta,
  I18nService,
  TenantService,
  ToastService,
  extractErrorMessage,
  formatCop,
  type DocumentoEstados,
} from '@reddoc/core';
import {
  BreadcrumbComponent,
  DataTableComponent,
  type BreadcrumbItem,
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import { ENTITY_DATA_GATEWAY } from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import { DocumentDetailActionsComponent } from '@erp/core/module-config/components/document-detail-actions/document-detail-actions.component';
import { DocumentEstadosComponent } from '@erp/core/module-config/components/document-estados/document-estados.component';
import { humanoDocumentoBreadcrumb } from '@erp/features/humano/shared/humano-breadcrumb';
import type { AppDict } from '@erp/i18n';
import {
  DIAN_DOCUMENT_URL,
  NOMINA_ELECTRONICA_DETALLE_COLUMNS,
  NOMINA_ELECTRONICA_ORIGEN_COLUMNS,
  NOMINA_ELECTRONICA_ORIGEN_ROW_ACTIONS,
} from '../../nomina-electronica.constants';
import {
  CAPACIDADES_VACIAS,
  capacidadesDe,
  type CapacidadesNominaElectronica,
} from '../../nomina-electronica.estado';
import type {
  NominaElectronicaDetalleRead,
  NominaElectronicaOrigen,
  NominaElectronicaRead,
} from '../../nomina-electronica.model';
import { NominaElectronicaService } from '../../nomina-electronica.service';

/** Ruta de la ficha de nómina, para navegar desde la pestaña de origen. */
const NOMINA_DETALLE_PATH = ['nomina', 'detalle'];

/**
 * Ficha de una **nómina electrónica** — solo lectura, con cuatro acciones de
 * estado.
 *
 * El documento no se captura a mano: lo fabrica la acción "Generar" del listado
 * consolidando las nóminas de un periodo. Desde acá se aprueba, se desaprueba,
 * se anula y se emite a la DIAN, y se ve de qué está hecho el consolidado.
 *
 * Carga tres cosas en paralelo: cabecera (`ENTITY_DATA_GATEWAY.getById`), las
 * nóminas origen y las líneas. Las dos últimas son consultas propias de este
 * documento (ver `NominaElectronicaService`).
 */
@Component({
  selector: 'app-nomina-electronica-detail',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    TabsModule,
    BreadcrumbComponent,
    DataTableComponent,
    DocumentDetailActionsComponent,
    DocumentEstadosComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './nomina-electronica-detail.component.html',
  styleUrl: './nomina-electronica-detail.component.scss',
})
export class NominaElectronicaDetailComponent implements OnInit {
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly api = inject(NominaElectronicaService);
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

  protected readonly cabecera = signal<NominaElectronicaRead | null>(null);
  protected readonly origen = signal<readonly NominaElectronicaOrigen[]>([]);
  protected readonly lines = signal<readonly NominaElectronicaDetalleRead[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  protected readonly origenColumns = NOMINA_ELECTRONICA_ORIGEN_COLUMNS;
  protected readonly origenRowActions = NOMINA_ELECTRONICA_ORIGEN_ROW_ACTIONS;
  protected readonly detalleColumns = NOMINA_ELECTRONICA_DETALLE_COLUMNS;
  protected readonly formatAmount = formatCop;

  /** Banderas de estado para la fila de badges. */
  protected readonly estados = computed<DocumentoEstados>(() => {
    const c = this.cabecera();
    return {
      estado_aprobado: c?.estado_aprobado ?? false,
      estado_anulado: c?.estado_anulado,
      estado_electronico: c?.estado_electronico,
      estado_electronico_enviado: c?.estado_electronico_enviado,
      estado_contabilizado: c?.estado_contabilizado,
    };
  });

  /**
   * Qué acciones ofrece la botonera. Una sola fuente: la tabla pura de
   * `nomina-electronica.estado.ts`, no cuatro condiciones sueltas en el template.
   */
  protected readonly capacidades = computed<CapacidadesNominaElectronica>(() =>
    this.cabecera() ? capacidadesDe(this.estados()) : CAPACIDADES_VACIAS,
  );

  /** Empleado en una sola línea: `<identificación> - <nombre>`. */
  protected readonly empleado = computed(() => {
    const c = this.cabecera();
    if (!c) return '—';
    const partes = [c.contacto_numero_identificacion, c.contacto_nombre_corto].filter(Boolean);
    return partes.length ? partes.join(' - ') : '—';
  });

  /** Enlace al documento en el portal de la DIAN, si ya se emitió. */
  protected readonly dianUrl = computed(() => {
    const cue = this.cabecera()?.cue;
    return cue ? `${DIAN_DOCUMENT_URL}${cue}` : null;
  });

  /** Migas: módulo Humano → listado → identificador del documento abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() =>
    humanoDocumentoBreadcrumb(
      this.t(),
      this.tenant.currentSlug(),
      this.i18n.translate(this.document().displayNameKey),
      this.document().id,
      `ID ${this.id() ?? ''}`,
    ),
  );

  ngOnInit(): void {
    const id = this.id() != null ? Number(this.id()) : NaN;
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.load(id);
  }

  protected formatFecha(iso: string | null | undefined): string {
    return formatFechaCorta(iso, '—');
  }

  protected onBack(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const segments = this.document().routes.list.split('/').filter(Boolean);
    void this.router.navigate(['/t', slug, 'humano', ...segments]);
  }

  /**
   * Abre la nómina origen de la fila.
   *
   * El ERP anterior pintaba esta tabla inerte; acá se llega a la ficha, que es
   * la pregunta natural al mirar de qué se compone el consolidado. Va en el ojo
   * y no en el click de la fila, como en el resto de las tablas.
   */
  protected onOrigenAction(event: RowActionInvokedEvent): void {
    if (event.actionId !== 'view') return;
    const slug = this.tenant.currentSlug();
    const nomina = event.row as NominaElectronicaOrigen;
    if (!slug || !nomina?.id) return;
    void this.router.navigate(['/t', slug, 'humano', ...NOMINA_DETALLE_PATH, nomina.id]);
  }

  /**
   * Emite a la DIAN previa confirmación; al éxito recarga la ficha. Es la única
   * acción de estado que sigue en la ficha: aprobar, desaprobar y anular los
   * resuelve la botonera, pero emitir solo existe en este documento.
   */
  protected onEmitir(): void {
    const rawId = this.id();
    if (!rawId) return;
    const id = Number(rawId);
    const a = this.t().documentActions.detail;
    this.confirmation.confirm({
      message: a.confirmEmitir.message,
      header: a.confirmEmitir.header,
      icon: 'pi pi-check-circle',
      acceptLabel: a.emitir,
      rejectLabel: this.t().common.actions.cancel,
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.emitirDocumento(id),
    });
  }

  private emitirDocumento(id: number): void {
    this.gateway
      .emitir(this.document(), id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const ts = this.t().documentActions.detail.toasts.emitirSuccess;
          this.toast.success(ts.title, ts.desc);
          this.load(id);
        },
        error: (err: unknown) => {
          const ts = this.t().documentActions.detail.toasts.emitirError;
          this.toast.error(ts.title, extractErrorMessage(err, ts.desc));
        },
      });
  }

  /**
   * La botonera cambió el estado del documento en el backend —lo aprobó,
   * desaprobó, anuló o (des)contabilizó—: se recarga la ficha para que la
   * cabecera (y la propia botonera, que lee de ella su estado) reflejen el nuevo.
   */
  protected onDocumentoChanged(): void {
    const id = this.id();
    if (!id) return;
    this.load(Number(id));
  }

  /** Cabecera, nóminas origen y líneas en paralelo. */
  private load(id: number): void {
    this.isLoading.set(true);
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      origen: this.api.listarOrigen(id),
      lines: this.api.listarDetalle(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, origen, lines }) => {
          this.cabecera.set(cabecera as NominaElectronicaRead);
          this.origen.set(origen);
          this.lines.set(lines);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
        },
      });
  }
}
