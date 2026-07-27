import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import {
  I18nService,
  TenantService,
  ToastService,
  extractErrorMessage,
  formatCop,
  type DocumentoEstados,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DocumentoDetalleService, ENTITY_DATA_GATEWAY } from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import { DocumentDetailActionsComponent } from '@erp/core/module-config/components/document-detail-actions/document-detail-actions.component';
import { DocumentEstadosComponent } from '@erp/core/module-config/components/document-estados/document-estados.component';
import { humanoDocumentoBreadcrumb } from '@erp/features/humano/shared/humano-breadcrumb';
import type { AppDict } from '@erp/i18n';
import { NominaConceptosTableComponent } from '../../components/nomina-conceptos-table/nomina-conceptos-table.component';
import type { NominaDetalleRead, NominaRead } from '../../nomina.model';

/** URL pública de la DIAN para consultar un documento electrónico por su CUE. */
const DIAN_DOCUMENT_URL = 'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=';

/**
 * Ficha (detalle) de una **nómina** — solo lectura.
 *
 * La nómina no se captura a mano: la emite el proceso de liquidación, así que
 * esta página no tiene gemela de formulario ni botón de editar. Desde acá se
 * vuelve a la lista, se imprime, y se aprueba/desaprueba.
 *
 * Carga cabecera (`ENTITY_DATA_GATEWAY.getById`) y conceptos
 * (`DocumentoDetalleService`) en paralelo, igual que las fichas de inventario.
 */
@Component({
  selector: 'app-nomina-detail',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    BreadcrumbComponent,
    DocumentDetailActionsComponent,
    DocumentEstadosComponent,
    NominaConceptosTableComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './nomina-detail.component.html',
  styleUrl: './nomina-detail.component.scss',
})
export class NominaDetailComponent implements OnInit {
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

  protected readonly cabecera = signal<NominaRead | null>(null);
  protected readonly lines = signal<readonly NominaDetalleRead[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  protected readonly formatMoney = formatCop;

  /** Banderas de estado para la fila de badges. */
  protected readonly estados = computed<DocumentoEstados>(() => {
    const c = this.cabecera();
    return {
      estado_aprobado: c?.estado_aprobado ?? false,
      estado_anulado: c?.estado_anulado,
      estado_contabilizado: c?.estado_contabilizado,
    };
  });

  /**
   * Un documento anulado queda congelado: ni se aprueba ni se desaprueba.
   * El legacy solo ofrecía desaprobar; acá se ofrecen las dos porque si no,
   * desaprobar sería un camino sin retorno.
   */
  protected readonly canAprobar = computed(() => {
    const c = this.cabecera();
    return !!c && !c.estado_aprobado && !c.estado_anulado;
  });

  protected readonly canDesaprobar = computed(() => {
    const c = this.cabecera();
    return !!c && c.estado_aprobado && !c.estado_anulado;
  });

  /** Empleado en una sola línea: `<identificación> - <nombre>`. */
  protected readonly empleado = computed(() => {
    const c = this.cabecera();
    if (!c) return '—';
    const partes = [c.contacto_numero_identificacion, c.contacto_nombre_corto].filter(Boolean);
    return partes.length ? partes.join(' - ') : '—';
  });

  /** Enlace al documento en el portal de la DIAN, si la nómina ya se emitió. */
  protected readonly dianUrl = computed(() => {
    const cue = this.cabecera()?.cue;
    return cue ? `${DIAN_DOCUMENT_URL}${cue}` : null;
  });

  /** Migas: módulo Humano → listado de nóminas → identificador de la abierta. */
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
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const segments = this.document().routes.list.split('/').filter(Boolean);
    void this.router.navigate(['/t', slug, 'humano', ...segments]);
  }

  /** Aprueba la nómina previa confirmación; al éxito recarga la ficha. */
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

  /** Desaprueba la nómina previa confirmación; al éxito recarga la ficha. */
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

  /** Descarga el PDF de la nómina. */
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
      lineas: this.detalleService.listarPorDocumento<NominaDetalleRead>(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas }) => {
          this.cabecera.set(cabecera as NominaRead);
          this.lines.set(lineas);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.nomina.detail.toasts.loadError;
          this.toast.error(toasts.title, toasts.desc);
        },
      });
  }

  /** Fecha larga (`20 de junio de 2026`) a partir del `yyyy-MM-dd` del backend. */
  protected formatFecha(value: string | null | undefined): string {
    if (!value) return '—';
    // El backend manda fecha sin hora; se parsea a mediodía UTC para que el
    // desfase de zona horaria no la corra un día hacia atrás.
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  /** Monto de cabecera; nulos y ceros se pintan como guion. */
  protected formatAmount(value: string | number | null | undefined): string {
    const parsed = typeof value === 'number' ? value : Number(value ?? 0);
    if (!Number.isFinite(parsed) || parsed === 0) return '—';
    return this.formatMoney(parsed);
  }
}
