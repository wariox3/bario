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
import type { BaseMovimientoRow } from '../../base.model';

/**
 * Tabla del informe **Base**: una línea contable por fila, con el documento que
 * la originó, su tercero, los movimientos y la base gravable.
 *
 * Componente tonto y **propio de este informe**: no reusa
 * `<app-saldos-cuenta-table>` porque no comparte ni una columna de saldos —acá
 * no hay saldo anterior ni actual, y sí `base` y `detalle`.
 *
 * Cierra con una fila de totales de débito, crédito y base. El informe original
 * no la tenía, pero en un informe de base gravable el total es justo el dato que
 * se busca (es lo que se declara), así que sumarlo evita tener que exportar a
 * Excel para conocerlo.
 */
@Component({
  selector: 'app-base-movimientos-table',
  standalone: true,
  templateUrl: './base-movimientos-table.component.html',
  styleUrl: './base-movimientos-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseMovimientosTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly locale = inject(LOCALE_ID);
  protected readonly t = this.i18n.t;

  readonly rows = input.required<readonly BaseMovimientoRow[]>();

  /**
   * `true` una vez que el usuario generó el informe. Distingue "todavía no
   * generaste" de "no hay resultados", que se leen muy distinto.
   */
  readonly generated = input<boolean>(false);

  protected readonly totalDebito = computed(() =>
    this.rows().reduce((acc, row) => acc + (row.debito ?? 0), 0),
  );
  protected readonly totalCredito = computed(() =>
    this.rows().reduce((acc, row) => acc + (row.credito ?? 0), 0),
  );
  protected readonly totalBase = computed(() =>
    this.rows().reduce((acc, row) => acc + (row.base ?? 0), 0),
  );

  protected formatMonto(value: number | null): string {
    return formatCop(value ?? 0);
  }

  /** Misma presentación de fecha que `<lib-data-table>`, para que se lean igual. */
  protected formatFecha(value: string | null | undefined): string {
    return formatFechaCorta(value);
  }
}
