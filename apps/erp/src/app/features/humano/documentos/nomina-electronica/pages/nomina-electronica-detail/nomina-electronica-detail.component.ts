import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import {
  I18nService,
  TenantService,
  ToastService,
  extractErrorMessage,
  formatCop,
  fromIsoDate,
  type DocumentoEstados,
} from '@reddoc/core';
import { BreadcrumbComponent, DataTableComponent, type BreadcrumbItem } from '@reddoc/feature-base';
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
  protected readonly capacidades = computed<CapacidadesNominaElectronica>(() => {
    const c = this.cabecera();
    if (!c) return CAPACIDADES_VACIAS;
    return capacidadesDe({
      estado_aprobado: c.estado_aprobado ?? false,
      estado_anulado: c.estado_anulado ?? false,
      estado_electronico_enviado: c.estado_electronico_enviado ?? false,
    });
  });

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
    const d = fromIsoDate(iso ?? null);
    return d ? d.toLocaleDateString() : '—';
  }

  protected onBack(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const segments = this.document().routes.list.split('/').filter(Boolean);
    void this.router.navigate(['/t', slug, 'humano', ...segments]);
  }

  /**
   * Abre la nómina origen sobre la que se hizo clic.
   *
   * El ERP anterior pintaba esta tabla inerte; acá la fila lleva a su ficha, que
   * es la pregunta natural al mirar de qué se compone el consolidado.
   */
  protected onOrigenClick(row: unknown): void {
    const slug = this.tenant.currentSlug();
    const nomina = row as NominaElectronicaOrigen;
    if (!slug || !nomina?.id) return;
    void this.router.navigate(['/t', slug, 'humano', ...NOMINA_DETALLE_PATH, nomina.id]);
  }

  protected onAprobar(): void {
    this.confirmarYEjecutar('confirmAprobar', 'aprobar', (id) =>
      this.gateway.aprobar(this.document(), id),
    );
  }

  protected onDesaprobar(): void {
    this.confirmarYEjecutar('confirmDesaprobar', 'desaprobar', (id) =>
      this.gateway.desaprobar(this.document(), id),
    );
  }

  protected onAnular(): void {
    this.confirmarYEjecutar('confirmAnular', 'anular', (id) =>
      this.gateway.anular(this.document(), id),
    );
  }

  protected onEmitir(): void {
    this.confirmarYEjecutar('confirmEmitir', 'emitir', (id) =>
      this.gateway.emitir(this.document(), id),
    );
  }

  /** Descarga el PDF del documento. */
  protected onImprimir(): void {
    const id = this.id();
    if (!id) return;
    this.gateway
      .imprimir(this.document(), Number(id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err: unknown) => {
          const ts = this.t().documentActions.detail.toasts.imprimirError;
          this.toast.error(ts.title, extractErrorMessage(err, ts.desc));
        },
      });
  }

  protected onArchivos(): void {
    // Sin endpoint todavía; el boton queda visible para no romper la botonera.
  }

  /**
   * Las cuatro acciones de estado se comportan igual: confirmar, llamar al
   * gateway, avisar y recargar. Solo cambian el texto y la llamada, así que van
   * por un único camino en vez de cuatro bloques calcados.
   */
  private confirmarYEjecutar(
    confirmKey: 'confirmAprobar' | 'confirmDesaprobar' | 'confirmAnular' | 'confirmEmitir',
    accion: 'aprobar' | 'desaprobar' | 'anular' | 'emitir',
    llamada: (id: number) => ReturnType<typeof this.gateway.aprobar>,
  ): void {
    const rawId = this.id();
    if (!rawId) return;
    const id = Number(rawId);
    const a = this.t().documentActions.detail;

    this.confirmation.confirm({
      message: a[confirmKey].message,
      header: a[confirmKey].header,
      icon: accion === 'anular' ? 'pi pi-ban' : 'pi pi-check-circle',
      acceptLabel: a[accion],
      rejectLabel: this.t().common.actions.cancel,
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => {
        llamada(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              const ts = a.toasts[`${accion}Success` as const];
              this.toast.success(ts.title, ts.desc);
              this.load(id);
            },
            error: (err: unknown) => {
              const ts = a.toasts[`${accion}Error` as const];
              this.toast.error(ts.title, extractErrorMessage(err, ts.desc));
            },
          });
      },
    });
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
