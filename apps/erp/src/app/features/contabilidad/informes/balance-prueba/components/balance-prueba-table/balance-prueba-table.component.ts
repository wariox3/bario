import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { PaginatorModule, type PaginatorState } from 'primeng/paginator';
import { I18nService, formatCop, toFiniteNumber } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { BalancePruebaRow, BalancePruebaTotales } from '../../balance-prueba.model';

/** Tamaños de página del ERP (mismos que `<lib-data-table>`). */
const ROWS_PER_PAGE = [10, 25, 50, 100];

/**
 * Tabla del **balance de prueba**, en vista compacta: cuenta, nombre, saldo
 * anterior, débito, crédito y saldo final. El backend abre además débito y
 * crédito del saldo anterior y del final; ese desglose queda para el Excel.
 *
 * Componente tonto: recibe la página y los totales, y emite el cambio de
 * página. No conoce el endpoint ni los parámetros.
 *
 * **No usa `<lib-data-table>`** porque necesita la fila de totales —el chequeo
 * de cuadre del informe—, que la tabla compartida no cubre. Pero sí replica su
 * lenguaje visual (densidad, header sticky, empty state, pie del paginador)
 * para que se lea como una tabla más del ERP y no como una isla.
 *
 * Los totales **no se calculan sobre las filas**: el informe pagina, así que
 * sumar lo recibido daría el total de la página. Vienen de la acción `totales/`.
 */
@Component({
  selector: 'app-balance-prueba-table',
  standalone: true,
  imports: [PaginatorModule],
  templateUrl: './balance-prueba-table.component.html',
  styleUrl: './balance-prueba-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BalancePruebaTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly rows = input.required<readonly BalancePruebaRow[]>();

  /** Totales del informe completo. `null` mientras no haya informe generado. */
  readonly totales = input<BalancePruebaTotales | null>(null);

  /**
   * `true` una vez que el usuario generó el informe. Distingue "todavía no
   * generaste" de "no hay resultados", que se leen muy distinto.
   */
  readonly generated = input<boolean>(false);

  /**
   * Consulta en curso — atenúa las filas en vez de vaciarlas. No aplica sobre
   * el empty state: no hay nada que refrescar y el spinner del botón ya lo dice.
   */
  readonly loading = input<boolean>(false);

  readonly totalCount = input<number>(0);
  readonly page = input<number>(0);
  readonly pageSize = input<number>(25);

  readonly pageChange = output<PaginatorState>();

  /** Cantidad de columnas — la usa el `colspan` del estado vacío. */
  protected readonly columnCount = 6;

  /** PrimeNG muta el array del dropdown, así que no puede ser el `readonly` de arriba. */
  protected readonly rowsPerPageOptions = [...ROWS_PER_PAGE];

  protected readonly isEmpty = computed(() => this.rows().length === 0);

  /**
   * Los totales solo se pintan sobre un informe con filas: un cuadre en $0
   * sobre un informe vacío no dice nada y compite con el empty state.
   */
  protected readonly totalesVisibles = computed(() => (this.isEmpty() ? null : this.totales()));

  /**
   * `true` si el informe no cuadra. En un balance cuadrado el total de débito
   * iguala al de crédito; compararlos a ojo es justo lo que se quiere evitar.
   */
  protected readonly descuadrado = computed(() => {
    const totales = this.totalesVisibles();
    if (!totales) return false;
    return toFiniteNumber(totales.debito) !== toFiniteNumber(totales.credito);
  });

  /** Primer registro de la página (1-based), para el contador del pie. */
  protected readonly rangeStart = computed(() =>
    this.totalCount() === 0 ? 0 : this.page() * this.pageSize() + 1,
  );

  protected readonly rangeEnd = computed(() =>
    Math.min((this.page() + 1) * this.pageSize(), this.totalCount()),
  );

  protected formatMonto(value: string | null | undefined): string {
    return formatCop(value ?? 0);
  }
}
