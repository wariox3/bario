import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService, type MenuItem } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenuModule } from 'primeng/menu';
import {
  FileDownloadService,
  I18nService,
  TenantService,
  ToastService,
  extractErrorMessage,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { LiquidacionAdicionalesTabComponent } from '../../components/liquidacion-adicionales-tab/liquidacion-adicionales-tab.component';
import { LiquidacionResumenComponent } from '../../components/liquidacion-resumen/liquidacion-resumen.component';
import { LIQUIDACION_LIST_PATH } from '../../liquidacion.constants';
import {
  CAPACIDADES_VACIAS,
  capacidadesDe,
  type CapacidadesLiquidacion,
} from '../../liquidacion.estado';
import type { Liquidacion } from '../../liquidacion.model';
import { LiquidacionService } from '../../liquidacion.service';

/** Acciones del ciclo que se confirman antes de ejecutarse. */
type AccionCiclo = 'generar' | 'reliquidar' | 'desgenerar' | 'aprobar' | 'desaprobar';

/**
 * **Workspace** de una liquidación: donde se revisa, se ajusta y se liquida el
 * cierre de un contrato.
 *
 * Toda la botonera sale de `capacidadesDe(...)`: **ninguna condición se combina
 * en la plantilla**. Las cinco acciones del ciclo piden confirmación, porque las
 * cinco tocan lo que se le va a pagar a una persona:
 *
 * - **Generar** liquida las prestaciones.
 * - **Reliquidar** rehace el cálculo sobre el borrador.
 * - **Desgenerar** borra la liquidación.
 * - **Aprobar** la cierra.
 * - **Desaprobar** revierte ese cierre.
 *
 * El ERP anterior solo confirma aprobar y desaprobar. Peor: su botón de generar
 * lee una bandera de carga que **nunca pone en `true`**, así que queda habilitado
 * durante la petición y se puede disparar dos veces.
 */
@Component({
  selector: 'app-liquidacion-workspace',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    MenuModule,
    BreadcrumbComponent,
    LiquidacionResumenComponent,
    LiquidacionAdicionalesTabComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './liquidacion-workspace.component.html',
  styleUrl: './liquidacion-workspace.component.scss',
})
export class LiquidacionWorkspaceComponent implements OnInit {
  private readonly service = inject(LiquidacionService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id de la liquidación (route param `:id`). */
  readonly id = input<string>();

  protected readonly liquidacion = signal<Liquidacion | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);
  /** Acción en vuelo: bloquea toda la botonera. */
  protected readonly accionEnCurso = signal<AccionCiclo | null>(null);
  protected readonly eliminando = signal(false);

  /** Se incrementa tras generar/reliquidar para refrescar los adicionales. */
  protected readonly reloadToken = signal(0);

  protected readonly liquidacionId = computed(() => {
    const id = this.id();
    return id ? Number(id) : 0;
  });

  /**
   * **La única fuente de qué se puede hacer.** Mientras la cabecera carga usa
   * `CAPACIDADES_VACIAS`, que no habilita nada.
   */
  protected readonly capacidades = computed<CapacidadesLiquidacion>(() => {
    const l = this.liquidacion();
    return l ? capacidadesDe(l) : CAPACIDADES_VACIAS;
  });

  protected readonly estaOcupado = computed(
    () => this.accionEnCurso() !== null || this.eliminando(),
  );

  /**
   * Acciones secundarias del desplegable. Se arman según capacidades: una acción
   * que no aplica a la etapa no aparece, en vez de mostrarse gris como en el ERP
   * anterior.
   */
  protected readonly accionesSecundarias = computed<MenuItem[]>(() => {
    const c = this.capacidades();
    const labels = this.t().entities.liquidacion.acciones;
    const bloqueado = this.estaOcupado();
    const items: MenuItem[] = [];

    if (c.puedeReliquidar) {
      items.push({
        label: labels.reliquidar,
        icon: 'pi pi-refresh',
        disabled: bloqueado,
        command: () => this.confirmar('reliquidar'),
      });
    }
    if (c.puedeDesgenerar) {
      items.push({
        label: labels.desgenerar,
        icon: 'pi pi-undo',
        disabled: bloqueado,
        command: () => this.confirmar('desgenerar'),
      });
    }
    if (c.puedeDesaprobar) {
      items.push({
        label: labels.desaprobar,
        icon: 'pi pi-times-circle',
        disabled: bloqueado,
        command: () => this.confirmar('desaprobar'),
      });
    }

    // Imprimir está disponible en las tres etapas, así que va siempre.
    const cierre: MenuItem[] = [
      { label: labels.imprimir, icon: 'pi pi-file-pdf', command: () => this.imprimir() },
    ];
    if (c.puedeEliminar) {
      cierre.push({
        label: this.t().common.actions.delete,
        icon: 'pi pi-trash',
        disabled: bloqueado,
        command: () => this.confirmarEliminar(),
      });
    }

    if (items.length > 0) items.push({ separator: true });
    return [...items, ...cierre];
  });

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.liquidacion.name,
        routerLink: slug ? ['/t', slug, ...LIQUIDACION_LIST_PATH] : undefined,
      },
      { label: `ID ${this.id() ?? ''}` },
    ];
  });

  ngOnInit(): void {
    const raw = this.id();
    const id = raw != null ? Number(raw) : NaN;
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.load(id);
  }

  // ── Navegación ────────────────────────────────────────────────────────────

  protected onBack(): void {
    this.navigateTo();
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  protected onGenerar(): void {
    this.confirmar('generar');
  }

  protected onAprobar(): void {
    this.confirmar('aprobar');
  }

  /** Los adicionales cambiaron: la cabecera trae otros totales. */
  protected onAdicionalesChange(): void {
    const id = this.liquidacionId();
    if (id) this.load(id);
  }

  /**
   * Pide confirmación y ejecuta. Las cinco acciones comparten esqueleto
   * —confirmar, bloquear, ejecutar, recargar— y solo cambian el endpoint y los
   * textos; separarlas en cinco métodos idénticos solo multiplicaría el riesgo de
   * que una se quede sin confirmación.
   */
  private confirmar(accion: AccionCiclo): void {
    if (this.estaOcupado()) return;
    const labels = this.t().entities.liquidacion.acciones;
    const confirmacion = labels.confirmaciones[accion];

    this.confirmation.confirm({
      header: confirmacion.header,
      message: confirmacion.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels[accion],
      rejectLabel: this.t().common.actions.cancel,
      // Las dos que destruyen lo calculado piden confirmación en rojo.
      acceptButtonStyleClass:
        accion === 'desgenerar' || accion === 'desaprobar' ? 'p-button-danger' : '',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.ejecutar(accion),
    });
  }

  private ejecutar(accion: AccionCiclo): void {
    const id = this.liquidacionId();
    if (!id) return;

    const toasts = this.t().entities.liquidacion.acciones.toasts[accion];
    this.accionEnCurso.set(accion);

    const operacion =
      accion === 'generar'
        ? this.service.generar(id)
        : accion === 'reliquidar'
          ? this.service.reliquidar(id)
          : accion === 'desgenerar'
            ? this.service.desgenerar(id)
            : accion === 'aprobar'
              ? this.service.aprobar(id)
              : this.service.desaprobar(id);

    operacion
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.accionEnCurso.set(null)),
      )
      .subscribe({
        next: () => {
          this.toast.success(toasts.success.title, toasts.success.desc);
          this.load(id);
          this.reloadToken.update((n) => n + 1);
        },
        error: (err: unknown) =>
          this.toast.error(toasts.error.title, extractErrorMessage(err, toasts.error.desc)),
      });
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────

  /**
   * Borrar la liquidación deja al contrato terminado sin su cierre, así que
   * confirma aparte y en rojo. Solo se ofrece en borrador (`puedeEliminar`).
   */
  private confirmarEliminar(): void {
    if (this.estaOcupado()) return;
    const labels = this.t().entities.liquidacion.acciones;
    this.confirmation.confirm({
      header: labels.confirmaciones.eliminar.header,
      message: labels.confirmaciones.eliminar.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.eliminar(),
    });
  }

  private eliminar(): void {
    const id = this.liquidacionId();
    if (!id) return;
    this.eliminando.set(true);
    this.service
      .remove([id])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.eliminando.set(false)),
      )
      .subscribe({
        next: () => {
          const toasts = this.t().common.toasts.deleteSuccess;
          this.toast.success(toasts.title, toasts.desc);
          this.navigateTo();
        },
        error: () => {
          const toasts = this.t().common.toasts.deleteError;
          this.toast.error(toasts.title, toasts.desc);
        },
      });
  }

  // ── Impresión ─────────────────────────────────────────────────────────────

  /**
   * PDF de la liquidación.
   *
   * El id va solo en el body; el ERP anterior le suma `filtros`, `limite`,
   * `desplazar`, `modelo` y `tipo`, que el endpoint no usa.
   */
  private imprimir(): void {
    const toasts = this.t().common.toasts;
    this.fileDownload
      .download(this.service.imprimirUrl, {
        method: 'POST',
        body: { id: this.liquidacionId() },
        fallbackFilename: 'liquidacion.pdf',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => this.toast.error(toasts.exportError.title, toasts.exportError.desc),
      });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private load(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (read) => {
          this.liquidacion.set(read);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.liquidacion.toasts.loadError;
          this.toast.error(toasts.title, toasts.desc);
        },
      });
  }

  private navigateTo(segment?: string, id?: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const commands: (string | number)[] = ['/t', slug, ...LIQUIDACION_LIST_PATH];
    if (segment) commands.push(segment);
    if (id != null) commands.push(id);
    void this.router.navigate(commands);
  }
}
