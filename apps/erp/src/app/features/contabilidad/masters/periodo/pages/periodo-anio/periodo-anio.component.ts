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
import { NgClass } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Menu, MenuModule } from 'primeng/menu';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, type MenuItem } from 'primeng/api';
import { type Observable, finalize } from 'rxjs';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { PeriodoService } from '../../periodo.service';
import type { Periodo } from '../../periodo.model';
import { aniosDisponibles, mesesDeAnio, periodoEstado } from '../../periodo.utils';
import { PeriodoInconsistenciasComponent } from '../../components/periodo-inconsistencias/periodo-inconsistencias.component';
import { PeriodoAnioNuevoDialogComponent } from '../../components/periodo-anio-nuevo/periodo-anio-nuevo-dialog.component';

/**
 * Vista principal de periodos: dos paneles. A la izquierda los años disponibles
 * (seleccionables) + botón para crear un año nuevo; a la derecha los meses del año
 * activo con su estado (abierto / bloqueado / cerrado / con inconsistencias) y un
 * menú de acciones por mes. Es la "firma" visual del master, distinta del resto.
 *
 * Estado en cliente: trae todos los periodos una vez (`listAll`) y deriva años y
 * meses con `computed`. Las acciones de estado (bloquear/desbloquear/cerrar) hacen
 * **optimistic update**: parchean el periodo en el signal de inmediato, reconcilian
 * con el periodo que devuelve el backend y revierten si la petición falla. Así la
 * fila cambia al instante sin recargar ni mostrar el spinner de la lista completa.
 */
@Component({
  selector: 'app-periodo-anio',
  standalone: true,
  imports: [
    NgClass,
    BreadcrumbComponent,
    ButtonModule,
    MenuModule,
    DialogModule,
    ConfirmDialog,
    PeriodoInconsistenciasComponent,
    PeriodoAnioNuevoDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './periodo-anio.component.html',
  styleUrl: './periodo-anio.component.scss',
})
export class PeriodoAnioComponent implements OnInit {
  private readonly service = inject(PeriodoService);
  private readonly tenant = inject(TenantService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Query param `?anio=` para preseleccionar tras crear un año. */
  readonly anio = input<string>();

  protected readonly periodos = signal<readonly Periodo[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly anioSeleccionado = signal<number | null>(null);

  protected readonly anios = computed(() => aniosDisponibles(this.periodos()));
  protected readonly mesesActivos = computed(() => {
    const anio = this.anioSeleccionado();
    return anio == null ? [] : mesesDeAnio(this.periodos(), anio);
  });

  /** Diálogo de inconsistencias. */
  protected readonly dialogVisible = signal(false);
  protected readonly periodoInconsistencia = signal<Periodo | null>(null);

  /** Diálogo de creación de año nuevo. */
  protected readonly nuevoDialogVisible = signal(false);

  /** Menú de acciones por fila: un único `p-menu` reusado con el periodo en foco. */
  private readonly rowMenu = viewChild.required<Menu>('rowMenu');
  private readonly menuPeriodo = signal<Periodo | null>(null);

  protected readonly rowMenuItems = computed<MenuItem[]>(() => {
    const p = this.menuPeriodo();
    if (!p) return [];
    const acciones = this.t().entities.periodo.acciones;
    const items: MenuItem[] = [
      {
        label: acciones.verInconsistencias,
        icon: 'pi pi-exclamation-triangle',
        command: () => this.abrirInconsistencias(p),
      },
      p.estado_bloqueado
        ? {
            label: acciones.desbloquear,
            icon: 'pi pi-lock-open',
            command: () => this.desbloquear(p),
          }
        : { label: acciones.bloquear, icon: 'pi pi-lock', command: () => this.bloquear(p) },
      { separator: true },
      {
        label: acciones.cerrar,
        icon: 'pi pi-check',
        disabled: !p.estado_bloqueado,
        command: () => this.confirmarCerrar(p),
      },
    ];
    return items;
  });

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.contabilidad.name,
        routerLink: slug ? ['/t', slug, 'contabilidad'] : undefined,
      },
      { label: this.t().entities.periodo.name },
    ];
  });

  ngOnInit(): void {
    const pre = Number(this.anio());
    this.loadAll(Number.isFinite(pre) && pre > 0 ? pre : undefined);
  }

  protected nombreMes(mes: number): string {
    return this.t().entities.periodo.meses[mes - 1] ?? '';
  }

  protected estadoDe(p: Periodo): ReturnType<typeof periodoEstado> {
    return periodoEstado(p);
  }

  protected iconoEstado(p: Periodo): string {
    if (p.estado_cerrado) return 'pi pi-check';
    if (p.estado_bloqueado) return 'pi pi-lock';
    return 'pi pi-lock-open';
  }

  protected seleccionarAnio(anio: number): void {
    this.anioSeleccionado.set(anio);
  }

  protected onNuevoAnio(): void {
    this.nuevoDialogVisible.set(true);
  }

  /** Tras crear un año, recarga y lo preselecciona. */
  protected onAnioCreado(anio: number): void {
    this.loadAll(anio);
  }

  protected onRowMenu(event: Event, periodo: Periodo): void {
    this.menuPeriodo.set(periodo);
    this.rowMenu().toggle(event);
  }

  private abrirInconsistencias(periodo: Periodo): void {
    this.periodoInconsistencia.set(periodo);
    this.dialogVisible.set(true);
  }

  private bloquear(periodo: Periodo): void {
    const toasts = this.t().entities.periodo.toasts;
    this.ejecutarAccion(
      periodo,
      { ...periodo, estado_bloqueado: true },
      this.service.bloquear(periodo.id),
      toasts.bloquearSuccess,
      toasts.bloquearError,
    );
  }

  private desbloquear(periodo: Periodo): void {
    const toasts = this.t().entities.periodo.toasts;
    this.ejecutarAccion(
      periodo,
      { ...periodo, estado_bloqueado: false },
      this.service.desbloquear(periodo.id),
      toasts.desbloquearSuccess,
      toasts.desbloquearError,
    );
  }

  private confirmarCerrar(periodo: Periodo): void {
    const cerrar = this.t().entities.periodo.confirms.cerrar;
    this.confirmation.confirm({
      header: cerrar.header,
      message: cerrar.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().entities.periodo.acciones.cerrar,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.cerrar(periodo),
    });
  }

  private cerrar(periodo: Periodo): void {
    const toasts = this.t().entities.periodo.toasts;
    this.ejecutarAccion(
      periodo,
      { ...periodo, estado_cerrado: true },
      this.service.cerrar(periodo.id),
      toasts.cerrarSuccess,
      toasts.cerrarError,
    );
  }

  /**
   * Ejecuta una acción de estado con optimistic update: aplica `optimista` al
   * instante, reconcilia con el periodo que devuelve el backend en `next` (fuente
   * de verdad, incluye `estado_inconsistencia`) y revierte a `original` si falla.
   */
  private ejecutarAccion(
    original: Periodo,
    optimista: Periodo,
    accion: Observable<Periodo>,
    okToast: { readonly title: string; readonly desc: string },
    errToast: { readonly title: string; readonly desc: string },
  ): void {
    this.patchPeriodo(optimista);
    accion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (actualizado) => {
        this.patchPeriodo(actualizado);
        this.toast.success(okToast.title, okToast.desc);
      },
      error: () => {
        this.patchPeriodo(original);
        this.toast.error(errToast.title, errToast.desc);
      },
    });
  }

  /** Reemplaza un periodo en el signal por su versión actualizada (match por `id`). */
  private patchPeriodo(actualizado: Periodo): void {
    this.periodos.update((list) => list.map((p) => (p.id === actualizado.id ? actualizado : p)));
  }

  private loadAll(preselect?: number): void {
    this.isLoading.set(true);
    this.service
      .listAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (periodos) => {
          this.periodos.set(periodos);
          this.sincronizarSeleccion(preselect);
        },
        error: () => {
          this.periodos.set([]);
          const toasts = this.t().entities.periodo.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  /** Mantiene una selección válida: prioriza `preselect`, conserva la actual si sigue, o cae al más reciente. */
  private sincronizarSeleccion(preselect?: number): void {
    const anios = this.anios();
    const target = preselect ?? this.anioSeleccionado();
    if (target != null && anios.includes(target)) {
      this.anioSeleccionado.set(target);
      return;
    }
    this.anioSeleccionado.set(anios[0] ?? null);
  }
}
