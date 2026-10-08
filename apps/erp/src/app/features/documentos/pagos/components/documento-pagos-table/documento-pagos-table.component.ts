import { Component, inject, input } from '@angular/core';
import { I18nService, formatCop } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { PagoFormRawValue } from '../../pago.form';

/**
 * Tabla **tonta** (solo lectura) de los pagos de un documento, para la ficha de detalle.
 *
 * Gemela de `DocumentoPagosComponent` (editable), igual que
 * `comercial-documento-lineas-table` lo es de la tabla de detalles: misma estructura
 * visual, celdas de texto y sin acciones. Los pagos anulados que devuelva el backend
 * se pintan con su valor tachado y no cuentan en el resumen.
 */
@Component({
  selector: 'app-documento-pagos-table',
  standalone: true,
  templateUrl: './documento-pagos-table.component.html',
  styleUrl: './documento-pagos-table.component.scss',
})
export class DocumentoPagosTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly formatMoney = formatCop;

  /** Pagos a renderizar (read mapeado a la forma del front), anulados incluidos. */
  readonly pagos = input.required<readonly PagoFormRawValue[]>();
}
