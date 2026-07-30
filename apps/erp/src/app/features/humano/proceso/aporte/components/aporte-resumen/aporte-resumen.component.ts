import { Component, computed, inject, input } from '@angular/core';
import { I18nService, formatCop, toFiniteNumber } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { estadoDe, type EstadoProceso } from '../../../shared/proceso.estado';
import { APORTE_COTIZACIONES } from '../../aporte.constants';
import { PRESENTACION, type Aporte } from '../../aporte.model';

/**
 * Resumen de la cabecera de un aporte: el periodo, el alcance, las entidades, los
 * contadores del proceso y los diez acumulados de cotización.
 *
 * Los acumulados se recorren desde `APORTE_COTIZACIONES` en vez de escribir once
 * filas de tabla a mano como el ERP anterior: agregar un concepto es tocar la
 * metadata y su clave i18n.
 */
@Component({
  selector: 'app-aporte-resumen',
  standalone: true,
  imports: [],
  templateUrl: './aporte-resumen.component.html',
  styleUrl: './aporte-resumen.component.scss',
})
export class AporteResumenComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly aporte = input.required<Aporte>();

  protected readonly formatMoney = formatCop;

  /** Etapa del ciclo, para el badge. */
  protected readonly estado = computed<EstadoProceso>(() => estadoDe(this.aporte()));

  /** Periodo en texto: `Julio 2026`, con el mes traducido. */
  protected readonly periodo = computed(() => {
    const { mes, anio } = this.aporte();
    const nombre = mes != null ? this.t().common.months[mes - 1] : undefined;
    return [nombre, anio].filter((parte) => parte != null && parte !== '').join(' ') || '—';
  });

  protected readonly presentacionLabel = computed(() => {
    const labels = this.t().entities.aporte.presentaciones;
    return this.aporte().presentacion === PRESENTACION.UNICA ? labels.unica : labels.sucursal;
  });

  protected readonly baseCotizacion = computed(
    () => toFiniteNumber(this.aporte().base_cotizacion) ?? 0,
  );

  protected readonly total = computed(() => toFiniteNumber(this.aporte().cotizacion_total) ?? 0);

  /** Los diez acumulados con su etiqueta ya resuelta y su valor numérico. */
  protected readonly cotizaciones = computed(() => {
    const aporte = this.aporte();
    return APORTE_COTIZACIONES.map(({ clave, labelKey }) => ({
      label: this.i18n.translate(labelKey),
      valor: toFiniteNumber(aporte[clave]) ?? 0,
    }));
  });
}
