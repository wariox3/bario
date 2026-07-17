import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import {
  I18nService,
  ToastService,
  formatCop,
  toFiniteNumber,
  type ColumnDef,
  type FilterCondition,
  type ListQuery,
  type SortSpec,
} from '@reddoc/core';
import { DataTableComponent, type PageChangeEvent } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { AgregarDocumentoService } from '../../agregar-documento.service';
import type {
  AgregarDocumentoModalData,
  DocumentoPendienteApi,
} from '../../agregar-documento.types';

/** Columnas de la tabla de documentos pendientes (solo lectura, selección múltiple). */
const AGREGAR_DOCUMENTO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'documento_tipo__nombre',
    headerKey: 'documentAdd.columns.tipo',
    type: 'text',
    width: '11rem',
  },
  { field: 'numero', headerKey: 'documentAdd.columns.numero', type: 'number', width: '7rem' },
  { field: 'fecha', headerKey: 'documentAdd.columns.fecha', type: 'date', width: '8rem' },
  {
    field: 'fecha_vence',
    headerKey: 'documentAdd.columns.fechaVence',
    type: 'date',
    width: '8rem',
  },
  { field: 'contacto__nombre_corto', headerKey: 'documentAdd.columns.contacto', type: 'text' },
  {
    field: 'total',
    headerKey: 'documentAdd.columns.total',
    type: 'currency',
    align: 'right',
    width: '9rem',
  },
  {
    field: 'afectado',
    headerKey: 'documentAdd.columns.afectado',
    type: 'currency',
    align: 'right',
    width: '9rem',
  },
  {
    field: 'pendiente',
    headerKey: 'documentAdd.columns.pendiente',
    type: 'currency',
    align: 'right',
    width: '9rem',
  },
];

/** Orden por defecto: documentos más recientes primero. */
const DEFAULT_SORT: readonly SortSpec[] = [{ field: 'fecha', direction: 'desc' }];

/**
 * Modal de **agregar documento** (cruce de cartera): lista los documentos con
 * saldo pendiente (`POST /general/documento/lista/?serializador=adicionar`) con
 * selección múltiple, paginación y orden. No persiste nada: al confirmar
 * **cierra el diálogo emitiendo las filas seleccionadas**
 * (`DocumentoPendienteApi[]`) por `ref.onClose`; al cancelar emite `null`. La
 * conversión a línea contable y la persistencia las hace el consumidor (la
 * tabla de detalles), que conoce el modo alta/edición.
 *
 * Por defecto acota al contacto de la cabecera; el checkbox "mostrar todos los
 * contactos" quita ese filtro (cruces de terceros distintos al de la cabecera).
 *
 * Se abre vía `DialogService.open(...)` con `{ ...ENTITY_ACTION_DIALOG_DEFAULTS }`
 * y `data: AgregarDocumentoModalData`. Se carga **lazy** (`import()` dinámico)
 * para no arrastrar PrimeNG/tabla al bundle inicial.
 *
 * TODO(filtros): la próxima iteración suma filtros de usuario sobre el
 * vocabulario `FilterField` de `@reddoc/core` (número, fecha, tipo, contacto),
 * inyectándolos en `buildQuery()` junto al filtro de contacto.
 */
@Component({
  selector: 'app-agregar-documento-modal',
  standalone: true,
  imports: [FormsModule, ButtonModule, CheckboxModule, DataTableComponent],
  templateUrl: './agregar-documento-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgregarDocumentoModalComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly dialogConfig = inject(DynamicDialogConfig);
  private readonly service = inject(AgregarDocumentoService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly columns = AGREGAR_DOCUMENTO_COLUMNS;

  /** Datos de entrada del diálogo (contacto a filtrar + familia de cartera). */
  private readonly data = this.dialogConfig.data as AgregarDocumentoModalData | undefined;

  protected readonly page = signal(0);
  protected readonly pageSize = signal(25);
  private readonly sort = signal<readonly SortSpec[]>([]);

  /** Quita el filtro por contacto: lista pendientes de todos los terceros. */
  protected readonly mostrarTodosLosContactos = signal(false);

  protected readonly items = signal<readonly DocumentoPendienteApi[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(false);
  protected readonly selected = signal<readonly DocumentoPendienteApi[]>([]);

  protected readonly selectedCount = computed(() => this.selected().length);

  /** Suma de los `pendiente` seleccionados: el valor que entraría al documento. */
  protected readonly totalSeleccionado = computed(() =>
    formatCop(this.selected().reduce((acc, doc) => acc + (toFiniteNumber(doc.pendiente) ?? 0), 0)),
  );

  constructor() {
    this.load();
  }

  protected onPageChange(event: PageChangeEvent): void {
    this.page.set(event.page);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  protected onSortChange(sort: readonly SortSpec[]): void {
    this.sort.set(sort);
    this.page.set(0);
    this.load();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selected.set(rows as DocumentoPendienteApi[]);
  }

  protected onMostrarTodosChange(mostrarTodos: boolean): void {
    this.mostrarTodosLosContactos.set(mostrarTodos);
    this.page.set(0);
    this.load();
  }

  /** Confirma: cierra emitiendo las filas seleccionadas (no persiste). */
  protected confirm(): void {
    if (this.selected().length === 0) return;
    this.ref.close([...this.selected()]);
  }

  protected cancel(): void {
    this.ref.close(null);
  }

  /** Arma el `ListQuery` con el filtro por contacto (salvo "todos") + orden + página. */
  private buildQuery(): ListQuery {
    const filters: FilterCondition[] = [];
    const contactoId = this.data?.contactoId;
    if (contactoId != null && !this.mostrarTodosLosContactos()) {
      filters.push({ field: 'contacto_id', operator: 'eq', value: contactoId });
    }
    // Sin orden del usuario, cae al orden por defecto (más recientes primero).
    const sort = this.sort().length > 0 ? [...this.sort()] : [...DEFAULT_SORT];
    return { filters, sort, page: this.page(), pageSize: this.pageSize() };
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .listarPendientes(this.data?.carteraTipo ?? 'cobrar', this.buildQuery())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.results);
          this.totalCount.set(res.totalCount);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          const toast = this.t().documentAdd.toasts.loadError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }
}
