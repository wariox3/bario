import { Component, computed, inject, input, output } from '@angular/core';
import { I18nService, formatCop, toHora } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { ErpSelectOption } from '@erp/core/components/api-select/erp-api-select.component';
import type { AfectacionRequest } from '@erp/core/module-config/components/afectacion-modal/afectacion.types';
import type { DetalleFormRawValue } from '../../servicio-documento-detalle.types';
import { lineAmount } from '../../servicio-documento-detalle.utils';

/**
 * Tabla **tonta** (presentacional) de las líneas de servicio de un documento.
 *
 * Única fuente de verdad del `<table>`, sus estilos y los helpers de vista
 * (formato y agrupación por puesto). La comparten el form
 * (`servicio-documento-detalles`, con acciones) y la ficha de detalle
 * (`servicio-documento-detail`, solo lectura): así un cambio visual se aplica a
 * ambos a la vez. No tiene HTTP ni estado de negocio — recibe `lines` y emite el
 * índice absoluto de la línea sobre la que el padre debe actuar.
 */
@Component({
  selector: 'app-servicio-documento-lineas-table',
  standalone: true,
  templateUrl: './servicio-documento-lineas-table.component.html',
  styleUrl: './servicio-documento-lineas-table.component.scss',
})
export class ServicioDocumentoLineasTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Líneas a renderizar (espejo del `FormArray` o del read mapeado). */
  readonly lines = input.required<readonly DetalleFormRawValue[]>();

  /** Muestra la columna de acciones (editar/eliminar). Solo lectura por defecto. */
  readonly showActions = input<boolean>(false);

  /**
   * Hace clickeables las columnas # y REF para consultar la afectación de la
   * línea. Solo el detail lo activa; en el form quedan como texto plano.
   */
  readonly linkable = input<boolean>(false);

  /** Índice absoluto de la línea a editar. */
  readonly edit = output<number>();
  /** Índice absoluto de la línea a eliminar. */
  readonly remove = output<number>();
  /** Petición de afectación (dirección + ids) al clickear el # o el REF de una línea. */
  readonly verAfectacion = output<AfectacionRequest>();

  /** Columnas totales para el `colspan` de la fila de grupo y el empty state. */
  protected readonly colspan = computed(() => (this.showActions() ? 16 : 15));

  /** Arma la petición de afectación de una línea en la dirección dada. */
  protected afectacionDe(
    line: DetalleFormRawValue,
    direction: AfectacionRequest['direction'],
  ): AfectacionRequest {
    return {
      lineId: line.id as number,
      afectadoId: line.documento_detalle_afectado,
      direction,
    };
  }

  /** Líneas agrupadas por puesto para renderizar separadores en la tabla. */
  protected readonly groupedLines = computed(() => {
    const result: Array<{
      puesto: ErpSelectOption | null;
      items: DetalleFormRawValue[];
      startIndex: number;
    }> = [];
    let cursor = 0;
    for (const line of this.lines()) {
      const last = result[result.length - 1];
      const sameGroup = last && (last.puesto?.id ?? null) === (line.puesto?.id ?? null);
      if (sameGroup) last.items.push(line);
      else result.push({ puesto: line.puesto, items: [line], startIndex: cursor });
      cursor++;
    }
    return result;
  });

  /** Subtotal de una línea por índice absoluto. */
  protected lineSubtotal(index: number): number {
    const line = this.lines()[index];
    return line ? lineAmount(line) : 0;
  }

  /** Formatea un monto a pesos colombianos sin decimales (`$ 1.000.000`). */
  protected readonly formatMoney = formatCop;

  /** Formatea una fecha a `dd MMM` (ej. `01 jun`). */
  protected formatDate(date: Date | null): string {
    if (!date) return '—';
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  }

  /** Formatea la hora de un `Date` a `HH:mm`. */
  protected formatTime(date: Date | null): string {
    return toHora(date) ?? '—';
  }

  /** "LMX-V--F" — 7 posiciones fijas + F al final si festivo. */
  protected formatDias(dias: readonly number[], festivo = false): string {
    const base = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
      .map((l, i) => (dias.includes(i) ? l : '-'))
      .join('');
    return festivo ? `${base}F` : base;
  }
}
