import { Component, computed, inject, input } from '@angular/core';
import { I18nService, formatCop } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { CuentaDetalleFormRawValue } from '../../contable-documento-detalle.types';

/** Columnas fijas: la primera (nº o id), cuenta, naturaleza y valor. */
const BASE_COLUMN_COUNT = 4;

/** Las tres columnas que enciende `showDocumentoAfectado`. */
const DOCUMENTO_AFECTADO_COLUMN_COUNT = 3;

/**
 * Tabla **tonta** (solo lectura) de las líneas de cuenta contable de un documento.
 *
 * Gemela read-only de `ContableDocumentoDetallesComponent` (que es editable inline):
 * mismas columnas y misma opción de prenderlas (`showContacto`, `showCentroCosto`,
 * `showBase`, `showNumero`, `showDetalle`), pero celdas de texto y sin acciones ni
 * persistencia. La usa la ficha de detalle de cualquier documento con asientos
 * manuales.
 *
 * Suma dos columnas que la editable no tiene, porque solo tienen sentido sobre
 * algo ya guardado: el **id** de la línea (`showId`) y el **documento cruzado**
 * abierto en sus tres campos (`showDocumentoAfectado`). Las prenden las fichas
 * de los documentos que cruzan cartera —el egreso, el pago—, que es donde el ERP
 * anterior las mostraba.
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

  /**
   * La primera columna muestra el **id** de la línea en vez de su posición.
   * Solo tiene sentido en una ficha: el id es lo que se cita para hablar de una
   * línea con soporte o con el backend, y el ordinal no identifica nada.
   */
  readonly showId = input<boolean>(false);

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

  protected readonly formatMoney = formatCop;

  /** Nº de columnas de la tabla; alimenta el `colspan` del estado vacío. */
  protected readonly columnCount = computed(
    () =>
      BASE_COLUMN_COUNT +
      (this.showDocumentoAfectado() ? DOCUMENTO_AFECTADO_COLUMN_COUNT : 0) +
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
