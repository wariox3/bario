import { Component, computed, inject, input } from '@angular/core';
import { I18nService, formatCop, type ResumenDocumento } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { ResumenPagos } from '@erp/features/documentos/pagos/pago.calculo';

const CANTIDAD_FORMAT = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

/**
 * Aside de **resumen** de un documento comercial: total cantidad (si se declara),
 * subtotal, descuento (si aplica), desglose por impuesto, total de impuestos y
 * total. Con `pagos` suma lo recibido y el saldo pendiente. Componente tonto
 * compartido por los formularios y las fichas de detalle, para que el bloque viva
 * en un solo lugar.
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

  /** Suma de cantidades de las líneas. `null` (default) oculta la fila. */
  readonly cantidad = input<number | null>(null);

  /** Recibido y saldo del documento. `null` (default) oculta el bloque de pagos. */
  readonly pagos = input<ResumenPagos | null>(null);

  /** Suma de los impuestos (con signo: las retenciones restan). */
  protected readonly totalImpuestos = computed(() =>
    this.resumen().impuestos.reduce((acc, imp) => acc + imp.total, 0),
  );

  protected readonly formatMoney = formatCop;

  protected formatCantidad(value: number): string {
    return CANTIDAD_FORMAT.format(value);
  }
}
