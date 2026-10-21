import { Component, computed, inject, input } from '@angular/core';
import { I18nService, formatCop } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { CuentaDetalleLineaView } from '../../contable-documento-detalle.types';

/** Columnas fijas: id, cuenta, naturaleza y valor. */
const BASE_COLUMN_COUNT = 4;

/** Las tres columnas que enciende `showDocumentoAfectado`. */
const DOCUMENTO_AFECTADO_COLUMN_COUNT = 3;

/** Las dos columnas que enciende `showTotales`: subtotal y neto. */
const TOTALES_COLUMN_COUNT = 2;

/**
 * Tabla **tonta** (solo lectura) de las líneas de cuenta contable de un documento.
 *
 * Gemela read-only de `ContableDocumentoDetallesComponent` (que es editable inline):
 * mismas columnas y misma opción de prenderlas (`showContacto`, `showCentroCosto`,
 * `showBase`, `showNumero`, `showDetalle`), pero celdas de texto y sin acciones ni
 * persistencia. La usa la ficha de detalle de cualquier documento con asientos
 * manuales.
 *
 * La primera columna es el **id** de la línea: es lo que se cita para hablar de
 * una línea con soporte o con el backend, y una posición no identifica nada.
 *
 * Suma una columna que la editable no tiene, porque solo tiene sentido sobre algo
 * ya guardado: el **documento cruzado** abierto en sus tres campos
 * (`showDocumentoAfectado`). La prenden las fichas de los documentos que cruzan
 * cartera —el egreso, el pago—, que es donde el ERP anterior la mostraba.
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
  readonly lines = input.required<readonly CuentaDetalleLineaView[]>();

  /**
   * Muestra las tres columnas del **documento cruzado**: su id, su tipo y su
   * número. Van juntas porque juntas identifican al documento, y separadas
   * —como las tenía el ERP anterior— porque el id es el que se busca y el par
   * tipo + número el que se reconoce.
   *
   * Solo trae algo en las líneas nacidas de "agregar documento"; en un asiento
   * manual las tres quedan vacías, así que se prende únicamente en los
   * documentos que cruzan.
   */
  readonly showDocumentoAfectado = input<boolean>(false);

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

  /**
   * Muestra el subtotal y el neto que el backend calcula por línea. Los pide la
   * ficha de la factura de compra, como el ERP anterior.
   */
  readonly showTotales = input<boolean>(false);

  protected readonly formatMoney = formatCop;

  /** Monto que puede no venir del backend: sin valor, la celda queda vacía. */
  protected formatMoneyOpcional(value: number | null | undefined): string {
    return value === null || value === undefined ? '' : formatCop(value);
  }

  /** Nº de columnas de la tabla; alimenta el `colspan` del estado vacío. */
  protected readonly columnCount = computed(
    () =>
      BASE_COLUMN_COUNT +
      (this.showDocumentoAfectado() ? DOCUMENTO_AFECTADO_COLUMN_COUNT : 0) +
      (this.showTotales() ? TOTALES_COLUMN_COUNT : 0) +
      [
        this.showNumero(),
        this.showContacto(),
        this.showCentroCosto(),
        this.showBase(),
        this.showDetalle(),
      ].filter(Boolean).length,
  );

  /** Etiqueta i18n de la naturaleza de una línea (`'D'`/`'C'`). */
  protected naturalezaLabel(line: CuentaDetalleLineaView): string {
    const n = this.t().entities.cuentaDetalle.naturaleza;
    return line.naturaleza === 'C' ? n.credito : n.debito;
  }
}
