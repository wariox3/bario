import { Component, computed, inject, input } from '@angular/core';
import { I18nService, formatCop, type ResumenDocumento, type ResumenPagos } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

const CANTIDAD_FORMAT = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

/** Débitos y créditos de las cuentas contables que acompañan a los ítems. */
export interface ResumenCuentasDocumento {
  readonly debitos: number;
  readonly creditos: number;
}

/**
 * Aside de **resumen** de un documento comercial: total cantidad (si se declara),
 * subtotal, descuento (si aplica), desglose por impuesto, total de impuestos y
 * total. Con `cuentas` suma los débitos y créditos de las líneas contables (el
 * `total` que llega ya los incluye). Con `pagos` suma lo recibido y el saldo
 * pendiente. Componente tonto compartido por los formularios y las fichas de
 * detalle, para que el bloque viva en un solo lugar.
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

  /**
   * Débitos y créditos de las cuentas contables del documento. `null` (default)
   * oculta las filas; cada una se pinta solo si tiene valor, como el legacy.
   */
  readonly cuentas = input<ResumenCuentasDocumento | null>(null);

  /**
   * El subtotal se pinta siempre, salvo en un documento con cuentas sin ítems:
   * ahí sería un «$0» que no dice nada (el legacy lo ocultaba en cero).
   */
  protected readonly mostrarSubtotal = computed(
    () => this.cuentas() === null || this.resumen().subtotal !== 0,
  );

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
