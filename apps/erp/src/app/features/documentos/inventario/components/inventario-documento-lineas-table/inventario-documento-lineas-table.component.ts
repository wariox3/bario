import { Component, inject, input } from '@angular/core';
import { I18nService, formatCop } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { lineTotal } from '../../inventario-documento-detalle.mapper';
import type { InventarioDetalleFormRawValue } from '../../inventario-documento-detalle.types';

/**
 * Tabla **tonta** (solo lectura) de las líneas de un documento de inventario.
 *
 * Gemela read-only de `InventarioDocumentoDetallesComponent` (que es editable
 * inline): misma estructura visual, pero celdas de texto y sin acciones. La usa
 * la ficha de detalle. El cálculo por línea reusa el mapper de la familia.
 */
@Component({
  selector: 'app-inventario-documento-lineas-table',
  standalone: true,
  templateUrl: './inventario-documento-lineas-table.component.html',
  styleUrl: './inventario-documento-lineas-table.component.scss',
})
export class InventarioDocumentoLineasTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Líneas a renderizar (read mapeado a la forma del front). */
  readonly lines = input.required<readonly InventarioDetalleFormRawValue[]>();

  protected readonly formatMoney = formatCop;

  /** Valorización de una línea por índice. */
  protected totalOf(index: number): number {
    const line = this.lines()[index];
    return line ? lineTotal(line) : 0;
  }
}
