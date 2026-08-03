import { Component, inject, input } from '@angular/core';
import { I18nService, formatCop } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { NominaDetalleRead } from '../../nomina.model';

/**
 * Tabla **tonta** (solo lectura) de los conceptos liquidados en una nómina.
 *
 * Equivalente humano de `InventarioDocumentoLineasTableComponent`: misma
 * estructura visual, pero con las columnas de la familia (concepto, días,
 * horas, bases) en vez de ítem/almacén. No existe gemela editable porque la
 * nómina no se captura a mano.
 */
@Component({
  selector: 'app-nomina-conceptos-table',
  standalone: true,
  templateUrl: './nomina-conceptos-table.component.html',
  styleUrl: './nomina-conceptos-table.component.scss',
})
export class NominaConceptosTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Conceptos a renderizar, tal como los devuelve el backend. */
  readonly lines = input.required<readonly NominaDetalleRead[]>();

  protected readonly formatMoney = formatCop;

  /**
   * Etiqueta del sentido del concepto. El backend usa tres valores: `1` suma
   * (devengado), `-1` resta (deducción) y `0` neutro —informativo, no mueve el
   * total—. Cualquier otro valor cae en neutro.
   */
  protected operacionLabel(line: NominaDetalleRead): string {
    const labels = this.t().entities.nominaDetalle.operaciones;
    if (line.operacion === 1) return labels.suma;
    if (line.operacion === -1) return labels.resta;
    return labels.neutro;
  }

  /** Número formateado sin símbolo de moneda (días, horas, porcentaje). */
  protected formatNumber(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed.toLocaleString('es-CO') : '—';
  }

  /** Monto formateado; los ceros se pintan como guion para aligerar la tabla. */
  protected formatAmount(value: string | number | null | undefined): string {
    const parsed = typeof value === 'number' ? value : Number(value ?? 0);
    if (!Number.isFinite(parsed) || parsed === 0) return '—';
    return this.formatMoney(parsed);
  }
}
