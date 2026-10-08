import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import {
  I18nService,
  ToastService,
  type ColumnDef,
  type FilterCondition,
  type ListQuery,
  type SortSpec,
} from '@reddoc/core';
import { DataTableComponent, type PageChangeEvent } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { ImportarDocumentoService } from '../../importar-documento.service';
import type { ImportarDocumentoModalData, LineaPendienteApi } from '../../importar-documento.types';

/** Columnas de la tabla de líneas pendientes (solo lectura, selección múltiple). */
const IMPORTAR_DOCUMENTO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'documento_numero',
    headerKey: 'documentImport.columns.documento',
    type: 'number',
    width: '7rem',
  },
  {
    field: 'documento_fecha',
    headerKey: 'documentImport.columns.fecha',
    type: 'date',
    width: '8rem',
  },
  { field: 'contacto_nombre_corto', headerKey: 'documentImport.columns.contacto', type: 'text' },
  { field: 'item_nombre', headerKey: 'documentImport.columns.item', type: 'text' },
  {
    field: 'cantidad',
    headerKey: 'documentImport.columns.cantidad',
    type: 'number',
    align: 'right',
    width: '7rem',
  },
  {
    field: 'precio',
    headerKey: 'documentImport.columns.precio',
    type: 'currency',
    align: 'right',
    width: '9rem',
  },
  {
    field: 'total',
    headerKey: 'documentImport.columns.total',
    type: 'currency',
    align: 'right',
    width: '9rem',
  },
  {
    field: 'pendiente',
    headerKey: 'documentImport.columns.pendiente',
    type: 'currency',
    align: 'right',
    width: '9rem',
  },
];

/** Orden por defecto: documentos más recientes primero (`-documento__fecha`). */
const DEFAULT_SORT: readonly SortSpec[] = [{ field: 'documento__fecha', direction: 'desc' }];

/**
 * Modal de **importar desde documento**: lista las líneas pendientes
 * (`POST /general/documento-detalle/pendiente/`) con selección múltiple,
 * paginación y orden. No persiste nada: al confirmar **cierra el diálogo
 * emitiendo las filas seleccionadas** (`LineaPendienteApi[]`) por `ref.onClose`;
 * al cancelar emite `null`. La resolución de cada línea y la persistencia las
 * hace el consumidor (la tabla de detalles), que conoce el modo alta/edición.
 *
 * Se abre vía `DialogService.open(...)` con `{ ...ENTITY_ACTION_DIALOG_DEFAULTS }`
 * y `data: ImportarDocumentoModalData`. Se carga **lazy** (`loadComponent`) para
 * no arrastrar PrimeNG/tabla al bundle inicial.
 */
@Component({
  selector: 'app-importar-documento-modal',
  standalone: true,
  imports: [ButtonModule, DataTableComponent],
  templateUrl: './importar-documento-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportarDocumentoModalComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly dialogConfig = inject(DynamicDialogConfig);
  private readonly service = inject(ImportarDocumentoService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly columns = IMPORTAR_DOCUMENTO_COLUMNS;

  /** Datos de entrada del diálogo (contacto a filtrar). */
  private readonly data = this.dialogConfig.data as ImportarDocumentoModalData | undefined;

  protected readonly page = signal(0);
  protected readonly pageSize = signal(25);
  private readonly sort = signal<readonly SortSpec[]>([]);

  protected readonly items = signal<readonly LineaPendienteApi[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(false);
  protected readonly selected = signal<readonly LineaPendienteApi[]>([]);

  protected readonly selectedCount = computed(() => this.selected().length);

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
    this.selected.set(rows as LineaPendienteApi[]);
  }

  /** Confirma: cierra emitiendo las filas seleccionadas (no persiste). */
  protected confirm(): void {
    if (this.selected().length === 0) return;
    this.ref.close([...this.selected()]);
  }

  protected cancel(): void {
    this.ref.close(null);
  }

  /**
   * Arma el `ListQuery`: solo documentos aprobados, del contacto y del tipo origen
   * (si los hay) + orden + página. El saldo pendiente > 0 lo garantiza el backend.
   */
  private buildQuery(): ListQuery {
    const filters: FilterCondition[] = [
      // se comenta mientras el back agrega el campo
      // { field: 'documento__estado_aprobado', operator: 'eq', value: true },
    ];
    const documentoTipoId = this.data?.documentoTipoId;
    if (documentoTipoId != null) {
      filters.push({
        field: 'documento__documento_tipo_id',
        operator: 'eq',
        value: documentoTipoId,
      });
    }
    const contactoId = this.data?.contactoId;
    if (contactoId != null) {
      filters.push({ field: 'documento__contacto_id', operator: 'eq', value: contactoId });
    }
    // Sin orden del usuario, cae al orden por defecto (más recientes primero).
    const sort = this.sort().length > 0 ? [...this.sort()] : [...DEFAULT_SORT];
    return { filters, sort, page: this.page(), pageSize: this.pageSize() };
  }

  private load(): void {
    this.loading.set(true);
    this.service
      .listarPendientes(this.buildQuery())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.results);
          this.totalCount.set(res.totalCount);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          const toast = this.t().documentImport.toasts.loadError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }
}
