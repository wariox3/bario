import { Component, inject, input } from '@angular/core';
import { I18nService, formatCop } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { ResumenInventario } from '../../inventario-documento-detalle.types';

/**
 * Aside de **resumen** de un documento de inventario: cantidad total, subtotal y
 * total. Componente tonto compartido por el form (tabla editable) y la ficha de
 * detalle, para que el bloque viva en un solo lugar.
 *
 * A diferencia del resumen comercial no hay desglose de impuestos ni descuento,
 * y sí aparece la **cantidad** acumulada: en un movimiento de almacén importa
 * cuántas unidades se movieron, no solo cuánto valen.
 */
@Component({
  selector: 'app-inventario-documento-resumen',
  standalone: true,
  templateUrl: './inventario-documento-resumen.component.html',
})
export class InventarioDocumentoResumenComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;
  readonly resumen = input.required<ResumenInventario>();
  protected readonly formatMoney = formatCop;
}
