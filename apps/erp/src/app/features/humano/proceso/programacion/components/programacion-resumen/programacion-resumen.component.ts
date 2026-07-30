import { Component, computed, inject, input, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { I18nService, formatCop, fromIsoDate, toFiniteNumber } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { PROGRAMACION_BANDERAS } from '../../programacion.banderas';
import { estadoDe, type EstadoProceso } from '../../../shared/proceso.estado';
import type { Programacion } from '../../programacion.model';

/**
 * Resumen de la cabecera de una programación: el periodo, el alcance, los
 * acumulados y en qué etapa del ciclo está.
 *
 * Las 17 banderas se muestran plegadas: solo las **activas**, y detrás de un
 * "ver más", porque son un detalle de configuración que se consulta poco una vez
 * armada la programación.
 */
@Component({
  selector: 'app-programacion-resumen',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './programacion-resumen.component.html',
  styleUrl: './programacion-resumen.component.scss',
})
export class ProgramacionResumenComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly programacion = input.required<Programacion>();

  protected readonly banderasVisibles = signal(false);

  protected readonly formatMoney = formatCop;

  /** Etapa del ciclo, para el badge. */
  protected readonly estado = computed<EstadoProceso>(() => estadoDe(this.programacion()));

  protected readonly fechaDesde = computed(() => fromIsoDate(this.programacion().fecha_desde));
  protected readonly fechaHasta = computed(() => fromIsoDate(this.programacion().fecha_hasta));

  protected readonly devengado = computed(() => toFiniteNumber(this.programacion().devengado) ?? 0);
  protected readonly deduccion = computed(() => toFiniteNumber(this.programacion().deduccion) ?? 0);
  protected readonly total = computed(() => toFiniteNumber(this.programacion().total) ?? 0);

  /**
   * Solo las banderas encendidas, con su etiqueta ya resuelta. Listar las 17 con
   * un sí/no obliga a leerlas todas para encontrar lo que aplica.
   */
  protected readonly banderasActivas = computed<readonly string[]>(() => {
    const p = this.programacion();
    return PROGRAMACION_BANDERAS.filter((bandera) => p[bandera.clave]).map((bandera) =>
      this.i18n.translate(bandera.labelKey),
    );
  });

  protected toggleBanderas(): void {
    this.banderasVisibles.update((visible) => !visible);
  }

  /** Fecha larga (`20 de junio de 2026`). */
  protected formatFecha(date: Date | null): string {
    if (!date) return '—';
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
