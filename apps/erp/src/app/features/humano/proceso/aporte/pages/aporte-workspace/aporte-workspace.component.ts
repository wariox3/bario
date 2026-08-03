import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService, type MenuItem } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenuModule } from 'primeng/menu';
import { TabsModule } from 'primeng/tabs';
import {
  FileDownloadService,
  I18nService,
  TenantService,
  ToastService,
  extractErrorMessage,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { AporteContratosTabComponent } from '../../components/aporte-contratos-tab/aporte-contratos-tab.component';
import { AporteDetallesTabComponent } from '../../components/aporte-detalles-tab/aporte-detalles-tab.component';
import { AporteEntidadesTabComponent } from '../../components/aporte-entidades-tab/aporte-entidades-tab.component';
import { AporteResumenComponent } from '../../components/aporte-resumen/aporte-resumen.component';
import { APORTE_LIST_PATH } from '../../aporte.constants';
import { CAPACIDADES_VACIAS, capacidadesDe, type CapacidadesAporte } from '../../aporte.estado';
import type { Aporte } from '../../aporte.model';
import { APORTE_EXPORTS, AporteService, type AporteExportKey } from '../../aporte.service';

/** Acciones del ciclo que se confirman antes de ejecutarse. */
type AccionCiclo = 'generar' | 'desgenerar' | 'aprobar' | 'desaprobar';

/** Pestañas del workspace. */
type Pestania = 'contratos' | 'detalles' | 'entidades';

/**
 * **Workspace** de un aporte a seguridad social: donde se arma, se liquida y se
 * aprueba la planilla del periodo.
 *
 * Es su propia página (no el formulario) porque un aporte generado tiene la
 * cabecera bloqueada y sigue necesitando este banco de trabajo — ver
 * `aporte.routes.ts`.
 *
 * Toda la botonera sale de `capacidadesDe(...)`: **ninguna condición se combina
 * en la plantilla**. Y las cuatro acciones del ciclo piden confirmación, porque
 * las cuatro tienen efecto sobre lo que la empresa paga:
 *
 * - **Generar** liquida el periodo y calcula lo que se le debe a cada entidad.
 * - **Desgenerar** borra esa liquidación.
 * - **Aprobar** cierra el aporte.
 * - **Desaprobar** revierte ese cierre.
 *
 * El ERP anterior solo confirmaba aprobar.
 */
@Component({
  selector: 'app-aporte-workspace',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    MenuModule,
    TabsModule,
    BreadcrumbComponent,
    AporteResumenComponent,
    AporteContratosTabComponent,
    AporteDetallesTabComponent,
    AporteEntidadesTabComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './aporte-workspace.component.html',
  styleUrl: './aporte-workspace.component.scss',
})
export class AporteWorkspaceComponent implements OnInit {
  private readonly service = inject(AporteService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del aporte (route param `:id`). */
  readonly id = input<string>();

  protected readonly aporte = signal<Aporte | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);
  /** Acción del ciclo en vuelo: bloquea toda la botonera. */
  protected readonly accionEnCurso = signal<AccionCiclo | null>(null);

  protected readonly activeTab = signal<Pestania>('contratos');

  /** Contratos cargados; alimenta la capacidad de generar. */
  protected readonly contratos = signal(0);
  /** Se incrementa tras generar/desgenerar para refrescar las tablas. */
  protected readonly reloadToken = signal(0);

  protected readonly aporteId = computed(() => {
    const id = this.id();
    return id ? Number(id) : 0;
  });

  /**
   * **La única fuente de qué se puede hacer.** Mientras la cabecera carga usa
   * `CAPACIDADES_VACIAS`, que no habilita nada.
   */
  protected readonly capacidades = computed<CapacidadesAporte>(() => {
    const a = this.aporte();
    if (!a) return CAPACIDADES_VACIAS;
    return capacidadesDe({ ...a, contratos: this.contratos() });
  });

  protected readonly estaOcupado = computed(() => this.accionEnCurso() !== null);

  /**
   * Acciones secundarias del desplegable. Se arman según capacidades: una acción
   * que no aplica a la etapa no aparece, en vez de mostrarse gris como en el ERP
   * anterior.
   */
  protected readonly accionesSecundarias = computed<MenuItem[]>(() => {
    const c = this.capacidades();
    const labels = this.t().entities.aporte.acciones;
    const bloqueado = this.estaOcupado();
    const items: MenuItem[] = [];

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

    // Entregables y descargas: siempre al final, separados de lo que muta.
    const descargas: MenuItem[] = [];
    if (c.puedeGenerarPlano) {
      descargas.push({
        label: labels.planoOperador,
        icon: 'pi pi-download',
        command: () => this.planoOperador(),
      });
    }
    descargas.push(
      { label: labels.imprimir, icon: 'pi pi-file-pdf', command: () => this.imprimir() },
      {
        label: labels.exportContratos,
        icon: 'pi pi-file-excel',
        command: () => this.exportar('contratos'),
      },
      {
        label: labels.exportDetalles,
        icon: 'pi pi-file-excel',
        command: () => this.exportar('detalles'),
      },
      {
        label: labels.exportEntidades,
        icon: 'pi pi-file-excel',
        command: () => this.exportar('entidades'),
      },
    );

    if (items.length > 0) items.push({ separator: true });
    return [...items, ...descargas];
  });

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.aporte.name,
        routerLink: slug ? ['/t', slug, ...APORTE_LIST_PATH] : undefined,
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

  protected onEdit(): void {
    this.navigateTo('editar', this.aporteId());
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  protected onGenerar(): void {
    this.confirmar('generar');
  }

  protected onAprobar(): void {
    this.confirmar('aprobar');
  }

  /** Contratos informados por la pestaña: entran en el cálculo de capacidades. */
  protected onContratosChange(total: number): void {
    this.contratos.set(total);
  }

  /**
   * Pide confirmación y ejecuta. Las cuatro acciones comparten esqueleto
   * —confirmar, bloquear, ejecutar, recargar— y solo cambian el endpoint y los
   * textos; separarlas en cuatro métodos idénticos solo multiplicaría el riesgo de
   * que una se quede sin confirmación.
   */
  private confirmar(accion: AccionCiclo): void {
    if (this.estaOcupado()) return;
    const labels = this.t().entities.aporte.acciones;
    const confirmacion = labels.confirmaciones[accion];

    this.confirmation.confirm({
      header: confirmacion.header,
      message: confirmacion.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels[accion],
      rejectLabel: this.t().common.actions.cancel,
      // Las dos que destruyen (desgenerar borra la liquidación, desaprobar
      // revierte el cierre) piden confirmación en rojo.
      acceptButtonStyleClass:
        accion === 'desgenerar' || accion === 'desaprobar' ? 'p-button-danger' : '',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.ejecutar(accion),
    });
  }

  private ejecutar(accion: AccionCiclo): void {
    const id = this.aporteId();
    if (!id) return;

    const toasts = this.t().entities.aporte.acciones.toasts[accion];
    this.accionEnCurso.set(accion);

    const operacion =
      accion === 'generar'
        ? this.service.generar(id)
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
          // La cabecera cambió de etapa y las tres tablas traen otros valores.
          this.load(id);
          this.reloadToken.update((n) => n + 1);
        },
        error: (err: unknown) =>
          this.toast.error(toasts.error.title, extractErrorMessage(err, toasts.error.desc)),
      });
  }

  // ── Entregables y descargas ───────────────────────────────────────────────

  /** El plano para el operador de PILA: el entregable del proceso. */
  private planoOperador(): void {
    this.descargar(this.service.planoOperadorUrl, 'plano-operador.txt');
  }

  private imprimir(): void {
    this.descargar(this.service.imprimirUrl, 'aporte.pdf');
  }

  /** Descargas del proceso: el id va en el body, como los pide el legacy. */
  private descargar(url: string, archivo: string): void {
    const toasts = this.t().common.toasts;
    this.fileDownload
      .download(url, {
        method: 'POST',
        body: { id: this.aporteId() },
        fallbackFilename: archivo,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => this.toast.error(toasts.exportError.title, toasts.exportError.desc),
      });
  }

  /**
   * Las tres exportaciones comparten forma: endpoint, serializador y el filtro que
   * acota a este aporte (ver `APORTE_EXPORTS`).
   */
  private exportar(clave: AporteExportKey): void {
    const config = APORTE_EXPORTS[clave];
    const toasts = this.t().common.toasts;
    this.fileDownload
      .download(config.url, {
        method: 'POST',
        body: {
          serializador: config.serializador,
          [config.filtro]: this.aporteId(),
        },
        fallbackFilename: config.archivo,
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
          this.aporte.set(read);
          // El backend ya sabe cuántos contratos tiene: sirve de arranque hasta
          // que la pestaña informe el suyo, para no dejar "generar" apagado en un
          // aporte que sí los tiene.
          this.contratos.set(read.contratos ?? 0);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.aporte.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateTo(segment?: string, id?: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const commands: (string | number)[] = ['/t', slug, ...APORTE_LIST_PATH];
    if (segment) commands.push(segment);
    if (id != null) commands.push(id);
    void this.router.navigate(commands);
  }
}
