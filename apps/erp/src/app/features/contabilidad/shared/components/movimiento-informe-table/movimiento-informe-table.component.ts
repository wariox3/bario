import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { PaginatorModule, type PaginatorState } from 'primeng/paginator';
import { I18nService, formatCop, formatFechaCorta, toFiniteNumber } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type {
  InformeEmptyCopySet,
  InformeFilaTipo,
  InformeMontoColumn,
  InformeTableRow,
  InformeTotales,
} from '../../movimiento-informe.types';

/** Tamaños de página del ERP (mismos que `<lib-data-table>`). */
const ROWS_PER_PAGE = [10, 25, 50, 100];

/** Los cuatro niveles del plan que son **subtotal**, no cuenta de movimiento. */
const SUBTOTALES: ReadonlySet<InformeFilaTipo> = new Set<InformeFilaTipo>([
  'CLASE',
  'GRUPO',
  'CUENTA',
  'SUBCUENTA',
]);

/** El detalle que cuelga de un auxiliar. */
const DETALLE: ReadonlySet<InformeFilaTipo> = new Set<InformeFilaTipo>(['TERCERO', 'MOVIMIENTO']);

/** Fila lista para pintar: la del backend más lo que decide su presentación. */
interface InformeFilaVm {
  readonly row: InformeTableRow;
  readonly esSubtotal: boolean;
  readonly esDetalle: boolean;
}

/**
 * Tabla de los nueve informes contables que sirve
 * `/contabilidad/movimiento-informe/`.
 *
 * Pinta el informe como lo que es: un **árbol aplanado**. El backend intercala
 * las filas de subtotal de clase, grupo y cuenta antes de cada auxiliar, y el
 * detalle (terceros y movimientos) después; `tipo` es lo único que las
 * distingue. Pintarlas todas iguales —como hacía la primera versión del balance
 * de prueba— hace leer los importes duplicados, porque cada subtotal está hecho
 * de los auxiliares que vienen debajo. Acá `tipo` decide el peso y el fondo de
 * la fila, no su sangría: código y nombre arrancan todos en el mismo borde.
 *
 * Componente tonto: recibe la página y los totales, y emite el cambio de
 * página. No conoce el endpoint ni los parámetros.
 *
 * **No usa `<lib-data-table>`** porque necesita la fila de totales —el chequeo
 * de cuadre del informe— y la jerarquía, dos cosas que la tabla compartida no
 * cubre. Pero sí replica su lenguaje visual (densidad, header sticky, empty
 * state, pie del paginador) para que se lea como una tabla más del ERP.
 *
 * Los totales **no se calculan sobre las filas**: el informe pagina, y además
 * sumar subtotales y detalle junto con los auxiliares multiplicaría el balance.
 * Vienen de la acción `totales/`, que suma solo las filas de tipo `AUXILIAR`.
 */
@Component({
  selector: 'app-movimiento-informe-table',
  standalone: true,
  imports: [PaginatorModule],
  templateUrl: './movimiento-informe-table.component.html',
  styleUrl: './movimiento-informe-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovimientoInformeTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly rows = input.required<readonly InformeTableRow[]>();

  /**
   * Columnas de **importe**, en orden. Van como dato y no como banderas porque
   * cada informe declara las suyas y los cuatro planos no comparten ninguna
   * entre sí (ver `InformeMontoField`). La fila de totales usa las mismas.
   */
  readonly amounts = input.required<readonly InformeMontoColumn[]>();

  /** Los dos textos del estado vacío, que aporta cada informe. */
  readonly empty = input.required<InformeEmptyCopySet>();

  /** Totales del informe completo. `null` mientras no haya informe generado. */
  readonly totales = input<InformeTotales | null>(null);

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

  /** Intercala identificación y nombre del tercero después del nombre de cuenta. */
  readonly showContacto = input<boolean>(false);

  /**
   * Intercala el documento que originó el movimiento (comprobante, número,
   * fecha). Lo usan los auxiliares, que bajan al movimiento en vez de quedarse
   * en el saldo agregado.
   */
  readonly showMovimiento = input<boolean>(false);

  /**
   * Intercala el **id del asiento**. Es la única forma de identificar una fila
   * de detalle en el auxiliar de cuenta, que no trae comprobante ni número; con
   * el id se puede buscar el asiento en la consulta de movimientos, que también
   * lista por `id`. Los auxiliares que sí traen comprobante y número no lo
   * encienden: ahí el id sería una columna técnica de más.
   */
  readonly showMovimientoId = input<boolean>(false);

  /** Intercala el texto escrito al contabilizar. Solo lo trae el informe *base*. */
  readonly showDetalle = input<boolean>(false);

  /**
   * Antepone clase y grupo. Lo usan los **estados financieros**, que ubican cada
   * cuenta en el plan con dos columnas en vez de con filas de subtotal.
   */
  readonly showUbicacion = input<boolean>(false);

  /**
   * `tipo` decide el peso y el fondo de la fila. Se apaga en los informes
   * **planos**: ahí todas las filas son del mismo tipo, así que el tratamiento
   * de detalle atenuaría la tabla entera sin distinguir nada.
   */
  readonly jerarquia = input<boolean>(true);

  /**
   * Avisa cuando el total de débito no iguala al de crédito. Solo tiene sentido
   * donde el informe **debe** cuadrar; en los planos, que listan lo que pasó en
   * el rango sin recorrer el plan, no hay nada que cuadre.
   */
  readonly descuadre = input<boolean>(true);

  readonly totalCount = input<number>(0);
  readonly page = input<number>(0);
  readonly pageSize = input<number>(25);

  readonly pageChange = output<PaginatorState>();

  /** PrimeNG muta el array del dropdown, así que no puede ser el `readonly` de arriba. */
  protected readonly rowsPerPageOptions = [...ROWS_PER_PAGE];

  /**
   * Columnas que **no** son importes: cuenta, nombre y los bloques opcionales.
   * La usa el `colspan` de la etiqueta "Total" en el pie.
   */
  protected readonly identityColumnCount = computed(
    () =>
      2 +
      (this.showUbicacion() ? 2 : 0) +
      (this.showContacto() ? 2 : 0) +
      (this.showMovimientoId() ? 1 : 0) +
      (this.showMovimiento() ? 3 : 0) +
      (this.showDetalle() ? 1 : 0),
  );

  /** Cantidad total de columnas — la usa el `colspan` del estado vacío. */
  protected readonly columnCount = computed(
    () => this.identityColumnCount() + this.amounts().length,
  );

  /**
   * Las filas decoradas con su presentación. Se calcula acá y no en el template
   * para que el `@for` quede declarativo y la lectura de `tipo` viva en un solo
   * lugar.
   */
  protected readonly filas = computed<readonly InformeFilaVm[]>(() =>
    this.rows().map((row) => ({
      row,
      esSubtotal: this.jerarquia() && SUBTOTALES.has(row.tipo),
      esDetalle: this.jerarquia() && DETALLE.has(row.tipo),
    })),
  );

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
    if (!this.descuadre()) return false;
    const totales = this.totalesVisibles();
    if (!totales) return false;
    return toFiniteNumber(totales.debito) !== toFiniteNumber(totales.credito);
  });

  /** Importe de una fila para la columna de monto dada. */
  protected montoDeFila(row: InformeTableRow, column: InformeMontoColumn): string {
    return this.formatMonto(row[column.field]);
  }

  /** Importe del pie para la columna de monto dada. */
  protected montoDeTotal(totales: InformeTotales, column: InformeMontoColumn): string {
    return this.formatMonto(totales[column.field]);
  }

  /**
   * El descuadre se resalta solo sobre las dos columnas que se comparan; pintar
   * de rojo los cuatro importes no diría cuál no cuadra.
   */
  protected resaltaDescuadre(column: InformeMontoColumn): boolean {
    return this.descuadrado() && (column.field === 'debito' || column.field === 'credito');
  }

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

  /** Misma presentación de fecha que `<lib-data-table>`, para que se lean igual. */
  protected formatFecha(value: string | null | undefined): string {
    return formatFechaCorta(value);
  }
}
