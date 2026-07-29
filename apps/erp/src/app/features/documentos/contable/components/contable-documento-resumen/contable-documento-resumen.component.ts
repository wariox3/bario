import { Component, computed, inject, input } from '@angular/core';
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

  /**
   * Muestra la fila "Diferencia" cuando débitos y créditos no coinciden. La pide
   * el asiento contable, donde cuadrar es la regla del documento; en un recaudo
   * la diferencia ES el neto y no hay nada que señalar.
   */
  readonly showDescuadre = input<boolean>(false);

  /** Diferencia entre débitos y créditos; `0` cuando el documento cuadra. */
  protected readonly descuadre = computed(() => this.resumen().debitos - this.resumen().creditos);

  protected readonly formatMoney = formatCop;
}
