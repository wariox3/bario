import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Subject, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import {
  I18nService,
  ToastService,
  type ColumnDef,
  type FilterCondition,
  type ListQuery,
  type SortSpec,
} from '@reddoc/core';
import {
  DataTableComponent,
  type PageChangeEvent,
  type RowAction,
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import {
  GenerarRecurrenteService,
  type PlantillaRecurrenteRow,
} from '../generar-recurrente/generar-recurrente.service';

/** Lo que el strategy le pasa al modal por `DialogService.open(..., { data })`. */
export interface ElegirRecurrenteModalData {
  /** Tipo de las plantillas a listar (p. ej. factura de compra recurrente). */
  readonly documentoTipoOrigen: number;
}

const PAGE_SIZE = 10;

/** Espera tras la última tecla antes de buscar, para no consultar por cada letra. */
const SEARCH_DEBOUNCE_MS = 300;

/** Las más nuevas primero, como el listado de plantillas. */
const SORT: readonly SortSpec[] = [{ field: 'id', direction: 'desc' }];

const COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'documentActions.elegirRecurrente.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'contacto_numero_identificacion',
    headerKey: 'documentActions.elegirRecurrente.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre_corto',
    headerKey: 'documentActions.elegirRecurrente.columns.contacto',
    type: 'text',
  },
  {
    field: 'subtotal',
    headerKey: 'documentActions.elegirRecurrente.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'documentActions.elegirRecurrente.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'documentActions.elegirRecurrente.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
];

const ROW_ACTIONS: readonly RowAction[] = [
  {
    id: 'seleccionar',
    labelKey: 'documentActions.elegirRecurrente.seleccionar',
    iconClass: 'pi pi-check',
    inline: true,
  },
];

/**
 * Modal de la acción "Recurrente": lista las plantillas recurrentes del tipo
 * de origen y deja elegir una.
 *
 * No genera nada: al seleccionar cierra el dialog con el id de la plantilla
 * por `ref.onClose`, y el strategy es quien llama al backend. Al cancelar
 * emite `null`.
 */
@Component({
  selector: 'app-elegir-recurrente-modal',
  standalone: true,
  imports: [ButtonModule, IconFieldModule, InputIconModule, InputTextModule, DataTableComponent],
  templateUrl: './elegir-recurrente-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElegirRecurrenteModalComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly config =
    inject<DynamicDialogConfig<ElegirRecurrenteModalData>>(DynamicDialogConfig);
  private readonly api = inject(GenerarRecurrenteService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly columns = COLUMNS;
  protected readonly rowActions = ROW_ACTIONS;

  protected readonly items = signal<readonly PlantillaRecurrenteRow[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(PAGE_SIZE);
  protected readonly search = signal('');

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((term) => {
        this.search.set(term);
        this.page.set(0);
        this.cargar();
      });
    this.cargar();
  }

  /**
   * Filtros en el orden que el backend necesita: los evalúa en secuencia, así
   * que la búsqueda va primero (`nombre OR identificación`) y el tipo al final
   * con `AND`. Con el tipo adelante, el `OR` dejaría pasar documentos de
   * cualquier tipo cuya identificación coincida.
   */
  private filtros(): readonly FilterCondition[] {
    const tipo: FilterCondition = {
      field: 'documento_tipo_id',
      operator: 'eq',
      value: this.config.data?.documentoTipoOrigen ?? 0,
    };
    const term = this.search().trim();
    if (!term) return [tipo];
    return [
      { field: 'contacto__nombre_corto', operator: 'contains', value: term },
      { field: 'contacto__numero_identificacion', operator: 'contains', value: term, logic: 'OR' },
      { ...tipo, logic: 'AND' },
    ];
  }

  private query(): ListQuery {
    return {
      filters: this.filtros(),
      sort: SORT,
      page: this.page(),
      pageSize: this.pageSize(),
    };
  }

  private cargar(): void {
    this.loading.set(true);
    this.api
      .listarPlantillas(this.query())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.items.set(res.results);
          this.totalCount.set(res.count);
        },
        error: () => {
          const dict = this.t().documentActions.elegirRecurrente;
          this.toast.error(dict.loadError.title, dict.loadError.desc);
        },
      });
  }

  protected onSearch(value: string): void {
    this.search$.next(value);
  }

  protected onPageChange(event: PageChangeEvent): void {
    this.page.set(event.page);
    this.pageSize.set(event.pageSize);
    this.cargar();
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId !== 'seleccionar') return;
    this.ref.close((event.row as PlantillaRecurrenteRow).id);
  }

  protected cancel(): void {
    this.ref.close(null);
  }
}
