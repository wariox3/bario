import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  input,
} from '@angular/core';
import { I18nService, formatCop, formatFechaCorta } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { SaldoCuentaTableRow } from '../../informe-cuentas.types';

/**
 * Tabla de **saldos por cuenta**, compartida por los informes contables
 * (balance de prueba, auxiliar de cuenta, balance por tercero, …).
 *
 * Componente tonto: recibe las filas y cómo pintarlas. No conoce el endpoint ni
 * los parámetros.
 *
 * **No usa `<lib-data-table>`** a propósito: estos informes no paginan (el
 * backend devuelve el resultado completo) y necesitan una fila de totales, dos
 * cosas que la tabla compartida no cubre.
 */
@Component({
  selector: 'app-saldos-cuenta-table',
  standalone: true,
  templateUrl: './saldos-cuenta-table.component.html',
  styleUrl: './saldos-cuenta-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaldosCuentaTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly locale = inject(LOCALE_ID);
  protected readonly t = this.i18n.t;

  readonly rows = input.required<readonly SaldoCuentaTableRow[]>();

  /**
   * `true` una vez que el usuario generó el informe. Distingue "todavía no
   * generaste" de "no hay resultados", que se leen muy distinto.
   */
  readonly generated = input<boolean>(false);

  /** Intercala identificación y nombre del tercero después del nombre de cuenta. */
  readonly showContacto = input<boolean>(false);

  /**
   * Intercala el documento que originó el movimiento (comprobante, número,
   * fecha). Lo usan los auxiliares, que bajan al movimiento en vez de quedarse
   * en el saldo agregado.
   */
  readonly showMovimiento = input<boolean>(false);

  /**
   * Pinta la fila de totales. Se apaga en los informes abiertos por tercero: la
   * misma cuenta aparece repetida por contacto, así que sumar la columna no da
   * el movimiento del periodo sino un número sin significado contable.
   */
  readonly showTotals = input<boolean>(true);

  /** Cantidad de columnas — la usa el `colspan` del estado vacío. */
  protected readonly columnCount = computed(
    () => 6 + (this.showContacto() ? 2 : 0) + (this.showMovimiento() ? 3 : 0),
  );

  /**
   * Totales de la columna de movimiento. En un informe cuadrado débito y crédito
   * coinciden, así que esta fila es el chequeo visual. Los saldos no se suman:
   * mezclan naturalezas y su total no significaría nada.
   */
  protected readonly totalDebito = computed(() =>
    this.rows().reduce((acc, row) => acc + (row.debito ?? 0), 0),
  );
  protected readonly totalCredito = computed(() =>
    this.rows().reduce((acc, row) => acc + (row.credito ?? 0), 0),
  );

  /** `true` si el informe no cuadra — se resalta para que salte a la vista. */
  protected readonly descuadrado = computed(
    () => this.rows().length > 0 && this.totalDebito() !== this.totalCredito(),
  );

  protected formatMonto(value: number | null | undefined): string {
    return formatCop(value ?? 0);
  }

  /** Misma presentación de fecha que `<lib-data-table>`, para que se lean igual. */
  protected formatFecha(value: string | null | undefined): string {
    return formatFechaCorta(value);
  }
}
