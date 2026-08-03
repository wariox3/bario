import { Component, computed, inject, input } from '@angular/core';
import { I18nService, formatCop } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { CuentaDetalleFormRawValue } from '../../contable-documento-detalle.types';

/** Columnas fijas: nº, cuenta, naturaleza y valor. */
const BASE_COLUMN_COUNT = 4;

/**
 * Tabla **tonta** (solo lectura) de las líneas de cuenta contable de un documento.
 *
 * Gemela read-only de `ContableDocumentoDetallesComponent` (que es editable inline):
 * mismas columnas y misma opción de prenderlas (`showContacto`, `showCentroCosto`,
 * `showBase`, `showNumero`, `showDetalle`), pero celdas de texto y sin acciones ni
 * persistencia. La usa la ficha de detalle de cualquier documento con asientos
 * manuales.
 */
@Component({
  selector: 'app-contable-documento-lineas-table',
  standalone: true,
  templateUrl: './contable-documento-lineas-table.component.html',
  styleUrl: './contable-documento-lineas-table.component.scss',
})
export class ContableDocumentoLineasTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Líneas a renderizar (read mapeado a la forma del front). */
  readonly lines = input.required<readonly CuentaDetalleFormRawValue[]>();

  /** Muestra la columna de tercero por línea (la imputa el pago; la factura no). */
  readonly showContacto = input<boolean>(false);

  /** Muestra la columna de centro de costo. */
  readonly showCentroCosto = input<boolean>(false);

  /** Muestra la columna de base gravable. */
  readonly showBase = input<boolean>(false);

  /** Muestra la columna de número de referencia de la línea (la imputa el asiento). */
  readonly showNumero = input<boolean>(false);

  /** Muestra la columna de glosa libre de la línea. */
  readonly showDetalle = input<boolean>(false);

  protected readonly formatMoney = formatCop;

  /** Nº de columnas de la tabla; alimenta el `colspan` del estado vacío. */
  protected readonly columnCount = computed(
    () =>
      BASE_COLUMN_COUNT +
      [
        this.showNumero(),
        this.showContacto(),
        this.showCentroCosto(),
        this.showBase(),
        this.showDetalle(),
      ].filter(Boolean).length,
  );

  /** Etiqueta i18n de la naturaleza de una línea (`'D'`/`'C'`). */
  protected naturalezaLabel(line: CuentaDetalleFormRawValue): string {
    const n = this.t().entities.cuentaDetalle.naturaleza;
    return line.naturaleza === 'C' ? n.credito : n.debito;
  }
}
