import { Component, computed, inject, input } from '@angular/core';
import { I18nService, formatCop, fromIsoDate, toFiniteNumber } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { estadoDe, type EstadoProceso } from '../../../shared/proceso.estado';
import { LIQUIDACION_PRESTACIONES } from '../../liquidacion.constants';
import type { Liquidacion } from '../../liquidacion.model';

/**
 * Resumen de una liquidación: el empleado, el periodo liquidado, las cuatro
 * prestaciones y los totales.
 *
 * Cada prestación se muestra con **desde cuándo se contó y cuántos días**, que es
 * lo que explica su monto. El interés de cesantías no tiene ninguno de los dos:
 * se calcula sobre la cesantía, así que esas celdas van vacías a propósito.
 *
 * Las cuatro se recorren desde `LIQUIDACION_PRESTACIONES` en vez de repartirlas
 * en una tabla de ocho columnas con media docena de celdas vacías para cuadrar la
 * grilla, como hace el ERP anterior.
 */
@Component({
  selector: 'app-liquidacion-resumen',
  standalone: true,
  imports: [],
  templateUrl: './liquidacion-resumen.component.html',
  styleUrl: './liquidacion-resumen.component.scss',
})
export class LiquidacionResumenComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly liquidacion = input.required<Liquidacion>();

  protected readonly formatMoney = formatCop;

  /** Etapa del ciclo, para el badge. */
  protected readonly estado = computed<EstadoProceso>(() => estadoDe(this.liquidacion()));

  /** Las cuatro prestaciones con su etiqueta, monto, días y fecha ya resueltos. */
  protected readonly prestaciones = computed(() => {
    const liquidacion = this.liquidacion();
    return LIQUIDACION_PRESTACIONES.map(({ labelKey, valor, dias, ultimoPago }) => ({
      label: this.i18n.translate(labelKey),
      valor: toFiniteNumber(liquidacion[valor]) ?? 0,
      dias: dias ? (liquidacion[dias] as number | null) : null,
      ultimoPago: ultimoPago ? this.formatFecha(liquidacion[ultimoPago] as string | null) : null,
    }));
  });

  protected readonly salario = computed(
    () => toFiniteNumber(this.liquidacion().contrato__salario) ?? 0,
  );
  protected readonly adicion = computed(() => toFiniteNumber(this.liquidacion().adicion) ?? 0);
  protected readonly deduccion = computed(() => toFiniteNumber(this.liquidacion().deduccion) ?? 0);
  protected readonly total = computed(() => toFiniteNumber(this.liquidacion().total) ?? 0);

  /** Fecha corta (`2026-07-30`); `—` si no hay valor. */
  protected formatFecha(value: string | null): string {
    const date = fromIsoDate(value);
    if (!date) return '—';
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
