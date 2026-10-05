import { Component, computed, inject, input } from '@angular/core';
import { I18nService, formatCop, toFiniteNumber } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { estadoDe, type EstadoProceso } from '../../../shared/proceso.estado';
import { APORTE_COTIZACIONES } from '../../aporte.constants';
import { PRESENTACION, type Aporte } from '../../aporte.model';

/** Un importe de la zona de valores, con su etiqueta ya resuelta. */
interface ValorResumen {
  readonly label: string;
  readonly valor: number;
}

/** Cuántos importes van por columna en la zona de valores. */
const VALORES_POR_COLUMNA = 4;

/**
 * Encabezado de un aporte, con el mismo patrón que el de la programación: filas
 * etiqueta/valor en columnas.
 *
 * - **Datos**, en tres columnas: de dónde y de cuándo (sucursal, mes, año,
 *   presentación), a qué entidades de la planilla, y a cuántos alcanza.
 * - **Valores**, en tres columnas de cuatro: la base y los diez acumulados de
 *   cotización, cerrando con el total.
 *
 * Los acumulados se recorren desde `APORTE_COTIZACIONES` en vez de escribir una
 * fila a mano por concepto: agregar uno es tocar la metadata y su clave i18n.
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

  /** Mes en texto (`Julio`), traducido. */
  protected readonly mes = computed(() => {
    const { mes } = this.aporte();
    return mes != null ? (this.t().common.months[mes - 1] ?? '') : '';
  });

  protected readonly presentacionLabel = computed(() => {
    const { presentacion } = this.aporte();
    if (presentacion == null) return '';
    const labels = this.t().entities.aporte.presentaciones;
    return presentacion === PRESENTACION.UNICA ? labels.unica : labels.sucursal;
  });

  protected readonly total = computed(() => toFiniteNumber(this.aporte().cotizacion_total) ?? 0);

  /**
   * La base y los diez acumulados, repartidos en columnas de cuatro. El total no
   * entra: cierra la última columna con su propio peso.
   */
  protected readonly columnasValores = computed<readonly (readonly ValorResumen[])[]>(() => {
    const aporte = this.aporte();
    const valores: ValorResumen[] = [
      {
        label: this.t().entities.aporte.resumen.labels.baseCotizacion,
        valor: toFiniteNumber(aporte.base_cotizacion) ?? 0,
      },
      ...APORTE_COTIZACIONES.map(({ clave, labelKey }) => ({
        label: this.i18n.translate(labelKey),
        valor: toFiniteNumber(aporte[clave]) ?? 0,
      })),
    ];
    const columnas: ValorResumen[][] = [];
    for (let i = 0; i < valores.length; i += VALORES_POR_COLUMNA) {
      columnas.push(valores.slice(i, i + VALORES_POR_COLUMNA));
    }
    return columnas;
  });
}
