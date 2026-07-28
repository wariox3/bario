import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService, formatCop } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { SaldoCuentaRow } from '../../informe-cuentas.types';

/**
 * Tabla de **saldos por cuenta**, compartida por los informes contables
 * (balance de prueba, auxiliar de cuenta, …).
 *
 * Componente tonto: recibe las filas y si el informe ya se generó, y pinta. No
 * conoce el endpoint ni los parámetros.
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
  protected readonly t = this.i18n.t;

  readonly rows = input.required<readonly SaldoCuentaRow[]>();

  /**
   * `true` una vez que el usuario generó el informe. Distingue "todavía no
   * generaste" de "no hay resultados", que se leen muy distinto.
   */
  readonly generated = input<boolean>(false);

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

  protected formatMonto(value: number | null): string {
    return formatCop(value ?? 0);
  }
}
