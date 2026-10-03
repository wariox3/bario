import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ButtonGroupModule } from 'primeng/buttongroup';
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
import { ImportDialogComponent } from '@erp/core/components/import-dialog/import-dialog.component';
import { importState } from '@erp/core/components/import-dialog/import-state';
import type { ExampleConfig } from '@erp/core/components/import-dialog/import-dialog.types';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { ProgramacionResumenComponent } from '../../components/programacion-resumen/programacion-resumen.component';
import { ProgramacionAdicionalesTabComponent } from '../../components/programacion-adicionales-tab/programacion-adicionales-tab.component';
import { ProgramacionRenglonesTabComponent } from '../../components/programacion-renglones-tab/programacion-renglones-tab.component';
import { PROGRAMACION_LIST_PATH } from '../../programacion.constants';
import {
  CAPACIDADES_VACIAS,
  capacidadesDe,
  type CapacidadesProgramacion,
} from '../../programacion.estado';
import type { Programacion } from '../../programacion.model';
import { ProgramacionService, cuerpoDe } from '../../programacion.service';

/** Acciones del ciclo que se confirman antes de ejecutarse. */
type AccionCiclo = 'generar' | 'desgenerar' | 'aprobar' | 'desaprobar';

/**
 * **Workspace** de una programación de nómina: donde se arma, se liquida y se
 * aprueba.
 *
 * Es su propia página (no el formulario) porque una programación generada tiene la
 * cabecera bloqueada y sigue necesitando este banco de trabajo — ver
 * `programacion.routes.ts`.
 *
 * Toda la botonera sale de `capacidadesDe(...)`: **ninguna condición se combina
 * en la plantilla**. Y las cuatro acciones del ciclo piden confirmación, porque
 * las cuatro tienen efecto sobre documentos de nómina reales:
 *
 * - **Generar** crea las nóminas del periodo.
 * - **Desgenerar** las borra.
 * - **Aprobar** las contabiliza.
 * - **Desaprobar** revierte esa contabilización.
 */
@Component({
  selector: 'app-programacion-workspace',
  standalone: true,
  imports: [
    ButtonModule,
    ButtonGroupModule,
    ConfirmDialogModule,
    MenuModule,
    TabsModule,
    BreadcrumbComponent,
    ImportDialogComponent,
    ProgramacionResumenComponent,
    ProgramacionRenglonesTabComponent,
    ProgramacionAdicionalesTabComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './programacion-workspace.component.html',
  styleUrl: './programacion-workspace.component.scss',
})
export class ProgramacionWorkspaceComponent implements OnInit {
  private readonly service = inject(ProgramacionService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id de la programación (route param `:id`). */
  readonly id = input<string>();

  protected readonly programacion = signal<Programacion | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);
  /** Acción del ciclo en vuelo: bloquea toda la botonera. */
  protected readonly accionEnCurso = signal<AccionCiclo | null>(null);
  /** Notificación en vuelo. No es del ciclo (no cambia de etapa) pero también bloquea. */
  protected readonly notificando = signal(false);

  protected readonly activeTab = signal<'renglones' | 'adicionales'>('renglones');

  /** Renglones cargados; alimenta la capacidad de generar. */
  protected readonly renglones = signal(0);
  /** Se incrementa tras generar/desgenerar para refrescar la tabla. */
  protected readonly reloadToken = signal(0);

  protected readonly programacionId = computed(() => {
    const id = this.id();
    return id ? Number(id) : 0;
  });

  /**
   * **La única fuente de qué se puede hacer.** Mientras la cabecera carga usa
   * `CAPACIDADES_VACIAS`, que no habilita nada.
   */
  protected readonly capacidades = computed<CapacidadesProgramacion>(() => {
    const p = this.programacion();
    if (!p) return CAPACIDADES_VACIAS;
    return capacidadesDe({ ...p, renglones: this.renglones() });
  });

  protected readonly estaOcupado = computed(
    () => this.accionEnCurso() !== null || this.notificando(),
  );

  // ── Importación de horas ──────────────────────────────────────────────────
  /** Las horas importadas cambian los renglones, así que al terminar se refrescan. */
  protected readonly importar = importState({
    upload: (file) => this.service.importarHoras(this.programacionId(), file),
    onImported: () => this.reloadToken.update((n) => n + 1),
  });

  /**
   * La plantilla de horas sale de esta programación: trae a sus empleados con
   * las horas actuales, se edita y se sube la misma. Por eso depende del id.
   */
  protected readonly exampleConfig = computed<ExampleConfig>(() => ({
    mode: 'enabled',
    endpoint: this.service.importarHorasEjemploUrl,
    params: { programacion_id: this.programacionId() },
    filename: `horas-programacion-${this.programacionId()}.xlsx`,
  }));

  /**
   * "Acciones": lo que deshace la etapa actual o lleva la nómina afuera. Como en
   * la ficha de los documentos, están siempre y se **deshabilitan** cuando no
   * aplican: la botonera no cambia de forma entre etapas y la persona aprende
   * dónde vive cada cosa.
   */
  protected readonly accionesItems = computed<MenuItem[]>(() => {
    const c = this.capacidades();
    const labels = this.t().entities.programacion.acciones;
    const bloqueado = this.estaOcupado();
    return [
      {
        label: labels.desgenerar,
        icon: 'pi pi-undo',
        disabled: bloqueado || !c.puedeDesgenerar,
        command: () => this.confirmar('desgenerar'),
      },
      {
        label: labels.desaprobar,
        icon: 'pi pi-times-circle',
        disabled: bloqueado || !c.puedeDesaprobar,
        command: () => this.confirmar('desaprobar'),
      },
      { separator: true },
      {
        label: labels.notificar,
        icon: 'pi pi-send',
        disabled: bloqueado || !c.puedeNotificar,
        command: () => this.confirmarNotificar(),
      },
    ];
  });

  /**
   * "Utilidades": importar horas y el PDF de las nóminas. El PDF de la
   * programación es el botón Imprimir, y los Excel viven en la tabla de
   * empleados, junto a lo que exportan.
   *
   * El legacy rotulaba "Importar nominas" a lo que en realidad **imprime** las
   * nóminas (`imprimirNominas()`); acá se llama por lo que hace.
   */
  protected readonly utilidadesItems = computed<MenuItem[]>(() => {
    const c = this.capacidades();
    const labels = this.t().entities.programacion.acciones;
    const bloqueado = this.estaOcupado();
    return [
      {
        label: labels.importarHoras,
        icon: 'pi pi-upload',
        disabled: bloqueado || !c.puedeImportarHoras,
        command: () => this.importar.open(),
      },
      {
        label: labels.imprimirNominas,
        icon: 'pi pi-file-pdf',
        disabled: !c.puedeImprimirNominas,
        command: () => this.imprimirNominas(),
      },
    ];
  });

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.programacion.name,
        routerLink: slug ? ['/t', slug, ...PROGRAMACION_LIST_PATH] : undefined,
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
    this.navigateTo('editar', this.programacionId());
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  protected onGenerar(): void {
    this.confirmar('generar');
  }

  protected onAprobar(): void {
    this.confirmar('aprobar');
  }

  /** Renglones informados por la tabla: entran en el cálculo de capacidades. */
  protected onRenglonesChange(total: number): void {
    this.renglones.set(total);
  }

  // ── Notificar ─────────────────────────────────────────────────────────────

  /**
   * Notificar manda los comprobantes a los empleados: es visible hacia afuera y no
   * se deshace, así que confirma aparte de las cuatro del ciclo.
   */
  private confirmarNotificar(): void {
    if (this.estaOcupado()) return;
    const labels = this.t().entities.programacion.acciones;
    this.confirmation.confirm({
      header: labels.confirmaciones.notificar.header,
      message: labels.confirmaciones.notificar.message,
      icon: 'pi pi-send',
      acceptLabel: labels.notificar,
      rejectLabel: this.t().common.actions.cancel,
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.notificar(),
    });
  }

  private notificar(): void {
    const id = this.programacionId();
    const toasts = this.t().entities.programacion.acciones.toasts.notificar;
    this.notificando.set(true);
    this.service
      .notificar(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.notificando.set(false)),
      )
      .subscribe({
        next: () => this.toast.success(toasts.success.title, toasts.success.desc),
        error: (err: unknown) =>
          this.toast.error(toasts.error.title, extractErrorMessage(err, toasts.error.desc)),
      });
  }

  // ── Impresión y descargas ─────────────────────────────────────────────────

  protected onImprimir(): void {
    this.descargar(this.service.imprimirUrl, 'programacion.pdf');
  }

  private imprimirNominas(): void {
    this.descargar(this.service.imprimirNominasUrl, 'nominas.pdf');
  }

  /** PDFs: la programación va en el body, como en las demás acciones. */
  private descargar(url: string, archivo: string): void {
    const toasts = this.t().common.toasts;
    this.fileDownload
      .download(url, {
        method: 'POST',
        body: cuerpoDe(this.programacionId()),
        fallbackFilename: archivo,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => this.toast.error(toasts.exportError.title, toasts.exportError.desc),
      });
  }

  // ── Importar horas ────────────────────────────────────────────────────────

  /**
   * Pide confirmación y ejecuta. Las cuatro acciones comparten esqueleto —
   * confirmar, bloquear, ejecutar, recargar— y solo cambian el endpoint y los
   * textos; separarlas en cuatro métodos idénticos solo multiplicaría el riesgo
   * de que una se quede sin confirmación.
   */
  private confirmar(accion: AccionCiclo): void {
    if (this.estaOcupado()) return;
    const labels = this.t().entities.programacion.acciones;
    const confirmacion = labels.confirmaciones[accion];

    this.confirmation.confirm({
      header: confirmacion.header,
      message: confirmacion.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels[accion],
      rejectLabel: this.t().common.actions.cancel,
      // Las dos que destruyen (desgenerar borra nóminas, desaprobar revierte la
      // contabilización) piden confirmación en rojo.
      acceptButtonStyleClass:
        accion === 'desgenerar' || accion === 'desaprobar' ? 'p-button-danger' : '',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.ejecutar(accion),
    });
  }

  private ejecutar(accion: AccionCiclo): void {
    const id = this.programacionId();
    if (!id) return;

    const toasts = this.t().entities.programacion.acciones.toasts[accion];
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
          // La cabecera cambió de etapa y los renglones traen otros valores: se
          // recargan las dos cosas.
          this.load(id);
          this.reloadToken.update((n) => n + 1);
        },
        error: (err: unknown) =>
          this.toast.error(toasts.error.title, extractErrorMessage(err, toasts.error.desc)),
      });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private load(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (read) => {
          this.programacion.set(read);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.programacion.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateTo(segment?: string, id?: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const commands: (string | number)[] = ['/t', slug, ...PROGRAMACION_LIST_PATH];
    if (segment) commands.push(segment);
    if (id != null) commands.push(id);
    void this.router.navigate(commands);
  }
}
