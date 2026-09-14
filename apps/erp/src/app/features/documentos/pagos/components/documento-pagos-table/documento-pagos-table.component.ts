import { Component, inject, input } from '@angular/core';
import { I18nService, formatCop } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { PagoFormRawValue } from '../../pago.form';

/**
 * Tabla **tonta** (solo lectura) de los pagos de un documento.
 *
 * Gemela read-only de `DocumentoPagosComponent` (editable inline), igual que
 * `comercial-documento-lineas-table` lo es de la tabla de detalles: misma
 * estructura visual, pero celdas de texto y sin acciones. La usa la ficha de
 * detalle; el resumen (recibido y saldo) lo pinta el documento, no la tabla.
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

  /** Pagos a renderizar (read mapeado a la forma del front). */
  readonly pagos = input.required<readonly PagoFormRawValue[]>();

  protected readonly formatMoney = formatCop;
}
