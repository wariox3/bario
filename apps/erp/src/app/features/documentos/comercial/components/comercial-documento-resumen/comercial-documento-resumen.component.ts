import { Component, inject, input } from '@angular/core';
import { I18nService, formatCop, type ResumenDocumento } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Aside de **resumen** de un documento comercial: subtotal, descuento (si aplica),
 * desglose por impuesto y total. Componente tonto compartido por el form (tabla de
 * líneas editable) y la ficha de detalle, para que el bloque viva en un solo lugar.
 */
@Component({
  selector: 'app-comercial-documento-resumen',
  standalone: true,
  templateUrl: './comercial-documento-resumen.component.html',
})
export class ComercialDocumentoResumenComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;
  readonly resumen = input.required<ResumenDocumento>();
  protected readonly formatMoney = formatCop;
}
