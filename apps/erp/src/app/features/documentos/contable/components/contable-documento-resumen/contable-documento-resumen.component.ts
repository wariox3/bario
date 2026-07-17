import { Component, inject, input } from '@angular/core';
import { I18nService, formatCop } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { ResumenContable } from '../../contable-documento-detalle.types';

/**
 * Aside de **resumen** de un documento contable: débitos, créditos y —si el
 * documento lo pide— el neto. Espeja `ComercialDocumentoResumenComponent`:
 * componente tonto compartido por la tabla editable y la ficha de detalle, para
 * que el bloque viva en un solo lugar.
 */
@Component({
  selector: 'app-contable-documento-resumen',
  standalone: true,
  templateUrl: './contable-documento-resumen.component.html',
})
export class ContableDocumentoResumenComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly resumen = input.required<ResumenContable>();

  /**
   * Suma la fila "Total" (`créditos − débitos`). Solo tiene sentido donde el neto
   * es el documento —un recaudo—, no en una pestaña de asientos.
   */
  readonly showTotal = input<boolean>(false);

  protected readonly formatMoney = formatCop;
}
