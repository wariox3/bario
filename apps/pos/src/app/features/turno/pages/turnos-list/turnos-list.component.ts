import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import {
  FilterStorageService,
  I18nService,
  ToastService,
  extractBlobErrorMessage,
  type FilterCondition,
  type ListQuery,
  type SortSpec,
} from '@reddoc/core';
import {
  DataFilterModalComponent,
  DataTableComponent,
  DataToolbarComponent,
  ListShellComponent,
  type BreadcrumbItem,
  type PageChangeEvent,
  type RowActionInvokedEvent,
  type ToolbarAction,
} from '@reddoc/feature-base';
import type { AppDict } from '@pos/i18n';
import { AbrirTurnoDialogComponent } from '../../components/abrir-turno-dialog/abrir-turno-dialog.component';
import { CerrarTurnoDialogComponent } from '../../components/cerrar-turno-dialog/cerrar-turno-dialog.component';
import { TurnoCerradoComponent } from '../../components/turno-cerrado/turno-cerrado.component';
import {
  type EstadoResumen,
  TurnoEnCursoComponent,
} from '../../components/turno-en-curso/turno-en-curso.component';
import {
  TURNOS_ACCION_ABRIR,
  TURNOS_ACCIONES_FILA,
  TURNOS_CAMPOS_FILTRO,
  TURNOS_COLUMNAS,
  TURNOS_FILTROS_STORAGE_KEY,
  TURNOS_ORDEN_DEFAULT,
} from '../../turno.constants';
import type { Turno, TurnoConDetalles, TurnoFila, TurnoResumen } from '../../turno.model';
import { TurnoService } from '../../turno.service';

/**
 * Turnos de caja: el movimiento. Arriba, el turno en curso de quien consulta
 * (si lo tiene); debajo, el listado de todos los turnos, más recientes primero.
 *
 * "Abrir turno" vive en la botonera y solo se ofrece cuando la persona no tiene
 * uno abierto: el backend admite uno por cajero. Mientras se consulta el abierto
 * no se ofrece nada, para no mostrar un botón que luego desaparece.
 */
@Component({
  selector: 'app-turnos-list',
  standalone: true,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  imports: [
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ButtonModule,
    AbrirTurnoDialogComponent,
    CerrarTurnoDialogComponent,
    TurnoCerradoComponent,
    TurnoEnCursoComponent,
  ],
  templateUrl: './turnos-list.component.html',
})
export class TurnosListComponent {
  private readonly service = inject(TurnoService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly items = signal<readonly TurnoFila[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly sort = signal<readonly SortSpec[]>(TURNOS_ORDEN_DEFAULT);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(TURNOS_FILTROS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  /** Fila del modal a enfocar al abrirlo desde una píldora; `null` desde el botón. */
  protected readonly filterFocusRow = signal<number | null>(null);

  /** `undefined` mientras se consulta; `null` si la persona no tiene turno abierto. */
  protected readonly enCurso = signal<Turno | null | undefined>(undefined);
  protected readonly abrirVisible = signal(false);
  protected readonly resumen = signal<TurnoResumen | null>(null);
  protected readonly estadoResumen = signal<EstadoResumen>('cargando');
  protected readonly imprimiendo = signal(false);
  protected readonly cerrarVisible = signal(false);
  /** El turno recién cerrado, para el acuse; se descarta a mano o al abrir otro. */
  protected readonly recienCerrado = signal<TurnoConDetalles | null>(null);

  protected readonly primaryAction = computed<ToolbarAction | null>(() =>
    this.enCurso() === null ? TURNOS_ACCION_ABRIR : null,
  );

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => [
    { label: this.t().layout.nav.turno },
  ]);

  protected readonly columns = TURNOS_COLUMNAS;
  protected readonly filterFields = TURNOS_CAMPOS_FILTRO;
  protected readonly rowActions = TURNOS_ACCIONES_FILA;

  constructor() {
    this.consultarEnCurso();
    this.cargar();
  }

  protected onToolbarAction(actionId: string): void {
    if (actionId === TURNOS_ACCION_ABRIR.id) this.abrirVisible.set(true);
  }

  /** El turno recién abierto pasa al tablero y entra primero en la lista. */
  protected onAbierto(turno: Turno): void {
    this.recienCerrado.set(null);
    this.enCurso.set(turno);
    this.cargarResumen();
    this.currentPage.set(0);
    this.cargar();
  }

  /** El cierre deja el acuse en el lugar del tablero y vuelve a ofrecer abrir. */
  protected onCerrado(turno: TurnoConDetalles): void {
    this.enCurso.set(null);
    this.resumen.set(null);
    this.recienCerrado.set(turno);
    this.cargar();
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId === 'imprimir') this.imprimir((event.row as TurnoFila).id);
  }

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.cargar();
  }

  protected onSortChange(sort: readonly SortSpec[]): void {
    this.sort.set(sort.length > 0 ? sort : TURNOS_ORDEN_DEFAULT);
    this.currentPage.set(0);
    this.cargar();
  }

  protected openFilters(focusRow: number | null = null): void {
    this.filterFocusRow.set(focusRow);
    this.filtersVisible.set(true);
  }

  /** Quita una sola condición desde su píldora, sin pasar por el modal. */
  protected removeFilter(index: number): void {
    this.onFiltersApply(this.activeFilters().filter((_, i) => i !== index));
  }

  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.filterStorage.write(TURNOS_FILTROS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.cargar();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(TURNOS_FILTROS_STORAGE_KEY);
    this.currentPage.set(0);
    this.cargar();
  }

  /** Si la consulta falla no se ofrece abrir: podría haber uno abierto que no se vio. */
  private consultarEnCurso(): void {
    this.service
      .abierto()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (turno) => {
          this.enCurso.set(turno);
          if (turno) this.cargarResumen();
        },
        error: () => {
          this.enCurso.set(undefined);
          const tx = this.t().turno.error;
          this.toast.error(tx.title, tx.desc);
        },
      });
  }

  protected cargarResumen(): void {
    const turno = this.enCurso();
    if (!turno) return;
    this.estadoResumen.set('cargando');
    this.service
      .resumen(turno.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resumen) => {
          this.resumen.set(resumen);
          this.estadoResumen.set('listo');
        },
        error: () => this.estadoResumen.set('error'),
      });
  }

  /**
   * El informe del turno: con el turno abierto sale como pre-cierre (sin
   * contado); cerrado, con el arqueo.
   */
  protected imprimir(id: number | undefined): void {
    if (id === undefined || this.imprimiendo()) return;
    this.imprimiendo.set(true);
    this.service
      .imprimir(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.imprimiendo.set(false)),
      )
      .subscribe({
        error: (err: unknown) => {
          const tx = this.t().turno.toasts.imprimirError;
          void extractBlobErrorMessage(err, tx.desc).then((mensaje) =>
            this.toast.error(tx.title, mensaje),
          );
        },
      });
  }

  private cargar(): void {
    const query: ListQuery = {
      filters: this.activeFilters(),
      sort: this.sort(),
      page: this.currentPage(),
    };
    this.isLoading.set(true);
    this.service
      .list(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.items.set(respuesta.results);
          this.totalCount.set(respuesta.count);
        },
        error: () => {
          this.items.set([]);
          this.totalCount.set(0);
          const tx = this.t().common.toasts.loadError;
          this.toast.error(tx.title, tx.desc);
        },
      });
  }
}
