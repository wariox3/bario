import { Component, inject, input, output } from '@angular/core';
import { I18nService, formatCop, type ImpuestoLinea } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { AfectacionRequest } from '@erp/core/module-config/components/afectacion-modal/afectacion.types';
import { lineBruto, lineNeto } from '../../comercial-documento-detalle.mapper';
import type { ComercialDetalleFormRawValue } from '../../comercial-documento-detalle.types';

/**
 * Tabla **tonta** (solo lectura) de las líneas de un documento comercial.
 *
 * Gemela read-only de `ComercialDocumentoDetallesComponent` (que es editable inline):
 * misma estructura visual, pero celdas de texto y sin acciones. La usa la ficha de
 * detalle (y cualquier documento comercial que necesite mostrar sus líneas sin
 * editar). El cálculo por línea reusa las funciones puras del mapper comercial.
 */
@Component({
  selector: 'app-comercial-documento-lineas-table',
  standalone: true,
  templateUrl: './comercial-documento-lineas-table.component.html',
  styleUrl: './comercial-documento-lineas-table.component.scss',
})
export class ComercialDocumentoLineasTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Líneas a renderizar (read mapeado a la forma del front). */
  readonly lines = input.required<readonly ComercialDetalleFormRawValue[]>();

  /**
   * Hace clickeables las columnas # y REF para consultar la afectación de la línea.
   * Solo el detail lo activa; en el form quedan como texto plano.
   */
  readonly linkable = input<boolean>(false);

  /** Petición de afectación (dirección + ids) al clickear el # o el REF de una línea. */
  readonly verAfectacion = output<AfectacionRequest>();

  protected readonly formatMoney = formatCop;

  /** Arma la petición de afectación de una línea en la dirección dada. */
  protected afectacionDe(
    line: ComercialDetalleFormRawValue,
    direction: AfectacionRequest['direction'],
  ): AfectacionRequest {
    return {
      lineId: line.id as number,
      afectadoId: line.documento_detalle_afectado,
      direction,
    };
  }

  /** Subtotal bruto de una línea por índice. */
  protected subtotalOf(index: number): number {
    const line = this.lines()[index];
    return line ? lineBruto(line) : 0;
  }

  /** Neto de una línea por índice. */
  protected netoOf(index: number): number {
    const line = this.lines()[index];
    return line ? lineNeto(line) : 0;
  }

  /** Impuestos de la línea (id, nombre, monto) para los badges. */
  protected impuestosOf(index: number): readonly ImpuestoLinea[] {
    return this.lines()[index]?.impuestos_totales ?? [];
  }
}
