import { CommonModule, formatDate, formatNumber } from '@angular/common';
import {
  Component,
  LOCALE_ID,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import type { MenuItem, SortMeta } from 'primeng/api';
import {
  I18nService,
  formatCop,
  toFiniteNumber,
  type ColumnDef,
  type ColumnPart,
  type SortSpec,
} from '@reddoc/core';
import type { PageChangeEvent, RowAction, RowActionInvokedEvent } from './data-table.types';
import { multiSortMetaToSpecs, sortSpecsEqual } from './sort.util';

/**
 * Componente "tonto" de tabla de datos.
 *
 * Recibe todo por inputs concretos y emite eventos. **No** conoce:
 *   - HTTP ni gateway
 *   - `EntityConfig`, `ModuleConfig` ni nada del framework configuracional
 *   - El módulo activo, la entidad activa, los permisos
 *
 * Es el building block compartido por:
 *   - Páginas de masters (`features/<x>/pages/<y>-list/...`)
 *   - `BaseDocumentListComponent` que lo compone internamente
 *
 * El único acoplamiento es con `I18nService` para traducir claves de columna y
 * de acciones. Eso es aceptable porque el dict es genérico (`unknown`) y solo
 * lo usa para resolver strings.
 */
@Component({
  selector: 'lib-data-table',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule, MenuModule, TooltipModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent {
  // ── Inputs requeridos ─────────────────────────────────────────────────────
  readonly columns = input.required<readonly ColumnDef[]>();
  readonly items = input.required<readonly unknown[]>();

  // ── Inputs opcionales ─────────────────────────────────────────────────────
  readonly totalCount = input<number>(0);
  readonly loading = input<boolean>(false);
  readonly pageSize = input<number>(25);
  readonly currentPage = input<number>(0);
  readonly rowsPerPageOptions = input<readonly number[]>([10, 25, 50, 100]);
  /**
   * Alto del cuerpo scrollable (modo `scrollable` de PrimeNG). Default `'flex'`:
   * la tabla llena el alto disponible de su contenedor flex (header sticky,
   * paginador anclado, solo el cuerpo scrollea). Un consumidor embebido puede
   * pasar un valor fijo (`'60vh'`, `'420px'`).
   */
  readonly scrollHeight = input<string>('flex');
  readonly selectionMode = input<'none' | 'multiple'>('none');
  readonly selectedRows = input<readonly unknown[]>([]);
  /**
   * Ordenamiento activo (controlado por el host). Refleja el estado en los
   * iconos de los headers tras recargar o rehidratar desde storage.
   */
  readonly sort = input<readonly SortSpec[]>([]);
  readonly rowActions = input<readonly RowAction[]>([]);
  /**
   * Habilita el click sobre la fila (cursor + emisión de `rowClick`). Por
   * defecto `false` para no insinuar interactividad en tablas que no navegan.
   */
  readonly rowClickable = input<boolean>(false);
  readonly dataKey = input<string>('id');
  readonly emptyTitleKey = input<string>('common.list.empty.title');
  readonly emptySubKey = input<string>('common.list.empty.sub');
  readonly rowMenuLabelKey = input<string>('common.actions.menuLabel');

  // ── Outputs ───────────────────────────────────────────────────────────────
  readonly pageChange = output<PageChangeEvent>();
  readonly sortChange = output<readonly SortSpec[]>();
  readonly selectionChange = output<unknown[]>();
  readonly rowActionInvoked = output<RowActionInvokedEvent>();
  readonly rowClick = output<unknown>();

  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly i18n = inject<I18nService<unknown>>(I18nService);
  /** Locale activo (lo registra cada app; el ERP usa `es-CO`). */
  private readonly locale = inject(LOCALE_ID);

  /**
   * Menú popup compartido por todas las filas. Una sola instancia evita el
   * doble-clic que causaba un `<p-menu>` por fila con `[model]` reconstruido en
   * cada change-detection: el modelo (`rowMenuItems`) ahora solo cambia al abrir.
   */
  @ViewChild('rowMenu') private readonly rowMenu?: Menu;
  protected readonly rowMenuItems = signal<MenuItem[]>([]);

  // ── Derivados expuestos al template ───────────────────────────────────────
  protected readonly hasSelection = computed(() => this.selectionMode() !== 'none');

  /**
   * Acciones de fila partidas en dos: las `inline` (botón siempre visible, una
   * columna propia cada una) y las del menú ⋮ (el resto). El orden de cada
   * grupo respeta el del array de `rowActions`.
   */
  protected readonly inlineActions = computed<readonly RowAction[]>(() =>
    this.rowActions().filter((a) => a.inline),
  );
  protected readonly menuActions = computed<readonly RowAction[]>(() =>
    this.rowActions().filter((a) => !a.inline),
  );

  protected readonly rangeStart = computed(() =>
    this.totalCount() === 0 ? 0 : this.currentPage() * this.pageSize() + 1,
  );
  protected readonly rangeEnd = computed(() =>
    Math.min((this.currentPage() + 1) * this.pageSize(), this.totalCount()),
  );

  /**
   * PrimeNG requiere arrays mutables en sus inputs `[value]`, `[selection]`
   * y `[rowsPerPageOptions]`. Los inputs del componente son `readonly` para
   * proteger a los consumidores; los exponemos como copias mutables aquí.
   */
  protected readonly mutableItems = computed(() => [...this.items()]);
  protected readonly mutableSelection = computed(() => [...this.selectedRows()]);
  protected readonly mutableRowsPerPage = computed(() => [...this.rowsPerPageOptions()]);

  /**
   * `sort` (contrato propio) traducido al formato `SortMeta[]` de PrimeNG.
   * `asc` → `order: 1`, `desc` → `order: -1`.
   */
  protected readonly primeSort = computed<SortMeta[]>(() =>
    this.sort().map((spec) => ({ field: spec.field, order: spec.direction === 'desc' ? -1 : 1 })),
  );

  // ── API protegida (template) ──────────────────────────────────────────────

  /**
   * Lee un campo arbitrario de una fila.
   * Las filas se tipan como `unknown` porque cada consumidor sabe su shape;
   * este componente solo proyecta los campos declarados por `columns`.
   */
  protected readValue(row: unknown, field: string): unknown {
    if (row === null || typeof row !== 'object') return null;
    return (row as Record<string, unknown>)[field];
  }

  /**
   * Moneda sin decimales en el locale activo (ERP: `$ 120.600`). El backend
   * suele mandar el monto como string con cola de ceros (`120600.000000`);
   * `formatCop` lo normaliza a número antes de formatear.
   */
  protected currencyCell(value: unknown): string {
    return formatCop(value, this.locale);
  }

  /** Número agrupado con hasta 2 decimales en el locale activo. */
  protected numberCell(value: unknown): string {
    const n = toFiniteNumber(value);
    return n === null ? '' : formatNumber(n, this.locale, '1.0-2');
  }

  /** Fecha localizada (acepta ISO string, epoch o `Date`). */
  protected dateCell(value: unknown): string {
    if (value === null || value === undefined || value === '') return '';
    try {
      return formatDate(value as string | number | Date, 'mediumDate', this.locale);
    } catch {
      return String(value);
    }
  }

  /**
   * Formatea una parte de una columna `combined`, leyendo su `field` de la fila y
   * aplicando el formateo de su `type` (default `text`). Reusa los formateadores de
   * celda para que el par se vea consistente con las columnas simples.
   */
  protected formatPart(row: unknown, part: ColumnPart): string {
    const value = this.readValue(row, part.field);
    switch (part.type) {
      case 'number':
        return this.numberCell(value);
      case 'currency':
        return this.currencyCell(value);
      case 'date':
        return this.dateCell(value);
      default:
        return value === null || value === undefined ? '' : String(value);
    }
  }

  /**
   * Abre el menú de acciones de una fila. Construye los ítems una sola vez (al
   * abrir) y los fija en `rowMenuItems`, manteniendo la referencia estable
   * mientras el menú está abierto.
   */
  protected openRowMenu(event: Event, row: unknown): void {
    this.rowMenuItems.set(this.buildRowMenuItems(row));
    this.rowMenu?.toggle(event);
  }

  /** Decide si una acción concreta es visible para una fila. */
  protected isActionVisible(action: RowAction, row: unknown): boolean {
    return action.visibleFor?.(row) ?? true;
  }

  /** Emite la invocación de una acción inline (botón siempre visible). */
  protected invokeRowAction(action: RowAction, row: unknown): void {
    this.rowActionInvoked.emit({ actionId: action.id, row });
  }

  /**
   * Construye los `MenuItem` de PrimeNG para una fila concreta a partir
   * de las acciones del menú y su predicado `visibleFor`.
   */
  private buildRowMenuItems(row: unknown): MenuItem[] {
    return this.menuActions()
      .filter((action) => this.isActionVisible(action, row))
      .map((action) => ({
        label: this.translate(action.labelKey),
        icon: action.iconClass,
        styleClass: action.severity === 'danger' ? 'lib-data-table__menu-item--danger' : undefined,
        command: () => this.rowActionInvoked.emit({ actionId: action.id, row }),
      }));
  }

  /**
   * Resuelve una clave i18n con notación de punto contra el diccionario activo.
   * Si la clave no existe devuelve la clave misma — facilita detectar
   * traducciones faltantes en desarrollo.
   */
  protected translate(key: string): string {
    const dict = this.i18n.t();
    const parts = key.split('.');
    let current: unknown = dict;
    for (const part of parts) {
      if (current === null || typeof current !== 'object') return key;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' ? current : key;
  }

  protected onPageEvent(event: { first: number; rows: number }): void {
    const nextPage = Math.floor(event.first / event.rows);
    if (nextPage === this.currentPage() && event.rows === this.pageSize()) return;
    this.pageChange.emit({ page: nextPage, pageSize: event.rows });
  }

  protected onSelectionEvent(rows: unknown[] | unknown): void {
    this.selectionChange.emit(Array.isArray(rows) ? rows : [rows]);
  }

  /**
   * Click sobre una fila. Solo emite si `rowClickable` está activo. Las celdas
   * de selección y de acciones detienen la propagación en el template, así que
   * usar el checkbox o el menú no dispara la navegación.
   */
  protected onRowClicked(row: unknown): void {
    if (!this.rowClickable()) return;
    this.rowClick.emit(row);
  }

  /**
   * Traduce el evento de ordenamiento multi-columna de PrimeNG
   * (`multiSortMeta`) al contrato `SortSpec[]` y lo emite.
   *
   * PrimeNG dispara `onSort` también al inicializar `[multiSortMeta]`; el guard
   * evita re-emitir (y recargar) cuando el orden no cambió respecto al input.
   */
  protected onSortEvent(event: { multiSortMeta?: SortMeta[] | null }): void {
    const specs = multiSortMetaToSpecs(event.multiSortMeta);
    if (sortSpecsEqual(this.sort(), specs)) return;
    this.sortChange.emit(specs);
  }
}
