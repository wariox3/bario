import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import {
  DocumentoDetalleService,
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
  SEGURIDAD_SOCIAL_DETALLE_COLUMNS,
} from '../../seguridad-social.constants';
import type { SeguridadSocialDetalleRead, SeguridadSocialRead } from '../../seguridad-social.model';

/**
 * Ficha de un **aporte a seguridad social** — solo lectura.
 *
 * El documento lo emite el proceso de aporte a partir de la planilla PILA del
 * periodo, así que esta página no tiene gemela de formulario ni botón de editar.
 * Desde acá se vuelve a la lista, se imprime, y se aprueba/desaprueba.
 *
 * El ERP anterior solo ofrece **desaprobar**; acá se ofrecen las dos, misma
 * decisión que en la ficha de nómina y por el mismo motivo: si no, desaprobar es
 * un camino sin retorno. **Anular no se ofrece** —el gateway sabe hacerlo, pero
 * el legacy no lo expone para este documento y no hay por qué inventarlo.
 *
 * Carga cabecera (`ENTITY_DATA_GATEWAY.getById`) y líneas
 * (`DocumentoDetalleService`) en paralelo, igual que la ficha de nómina.
 */
@Component({
  selector: 'app-seguridad-social-detail',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    BreadcrumbComponent,
    DataTableComponent,
    DocumentDetailActionsComponent,
    DocumentEstadosComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './seguridad-social-detail.component.html',
  styleUrl: './seguridad-social-detail.component.scss',
})
export class SeguridadSocialDetailComponent implements OnInit {
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

  protected readonly cabecera = signal<SeguridadSocialRead | null>(null);
  protected readonly lines = signal<readonly SeguridadSocialDetalleRead[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  protected readonly detalleColumns = SEGURIDAD_SOCIAL_DETALLE_COLUMNS;
  protected readonly formatAmount = formatCop;

  /** Banderas de estado para la fila de badges. */
  protected readonly estados = computed<DocumentoEstados>(() => {
    const c = this.cabecera();
    return {
      estado_aprobado: c?.estado_aprobado ?? false,
      estado_anulado: c?.estado_anulado,
      estado_contabilizado: c?.estado_contabilizado,
    };
  });

  /** Un documento anulado queda congelado: ni se aprueba ni se desaprueba. */
  protected readonly canAprobar = computed(() => {
    const c = this.cabecera();
    return !!c && !c.estado_aprobado && !c.estado_anulado;
  });

  protected readonly canDesaprobar = computed(() => {
    const c = this.cabecera();
    return !!c && !!c.estado_aprobado && !c.estado_anulado;
  });

  /** Empleado en una sola línea: `<identificación> - <nombre>`. */
  protected readonly empleado = computed(() => {
    const c = this.cabecera();
    if (!c) return '—';
    const partes = [c.contacto_numero_identificacion, c.contacto_nombre_corto].filter(Boolean);
    return partes.length ? partes.join(' - ') : '—';
  });

  /** Enlace al documento en el portal de la DIAN, si tiene código. */
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

  /**
   * Descarga el PDF. Va por el gateway, que manda **solo el id**: el ERP
   * anterior le suma `filtros`, `limite`, `desplazar`, `ordenamientos`,
   * `limite_conteo`, `modelo` y `tipo`, que el endpoint no usa.
   */
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

  /** Aprobar y desaprobar difieren solo en el texto y la llamada. */
  private confirmarYEjecutar(
    confirmKey: 'confirmAprobar' | 'confirmDesaprobar',
    accion: 'aprobar' | 'desaprobar',
    llamada: (id: number) => ReturnType<typeof this.gateway.aprobar>,
  ): void {
    const rawId = this.id();
    if (!rawId) return;
    const id = Number(rawId);
    const a = this.t().documentActions.detail;

    this.confirmation.confirm({
      message: a[confirmKey].message,
      header: a[confirmKey].header,
      icon: accion === 'aprobar' ? 'pi pi-check-circle' : 'pi pi-times-circle',
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

  /** Cabecera y líneas en paralelo. */
  private load(id: number): void {
    this.isLoading.set(true);
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      lines: this.detalleService.listarPorDocumento<SeguridadSocialDetalleRead>(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lines }) => {
          this.cabecera.set(cabecera as SeguridadSocialRead);
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
