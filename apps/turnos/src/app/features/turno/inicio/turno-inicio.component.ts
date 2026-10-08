import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  LOCALE_ID,
  type OnInit,
  signal,
} from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { I18nService, startOfToday, toIsoDate } from '@reddoc/core';
import type { AppDict } from '@turnos/i18n';
import type { AnaliticaHorasResponse } from './turno-inicio.model';
import { TurnoInicioService } from './turno-inicio.service';

/** Tarjeta de indicador (KPI) del inicio de Turno. */
interface KpiCard {
  readonly labelKey: keyof AppDict['turnoInicio']['kpis'];
  readonly value: string;
  readonly iconClass: string;
}

/** Preset de rango temporal del inicio (granularidad mensual del backend). */
type RangePreset = 'esteMes' | 'mesPasado' | 'ultimosTresMeses' | 'esteAnio';

/** Presets disponibles en la barra, en orden de aparición. */
interface PresetOption {
  readonly id: RangePreset;
  readonly labelKey: keyof AppDict['turnoInicio']['ranges'];
}

/**
 * Pantalla de inicio del módulo Turno.
 *
 * Landing del módulo (`defaultChildPath: 'inicio'`): tarjetas KPI + gráficos
 * de horas planeadas vs ejecutadas, alimentados por
 * `/general/documento/analitica-horas/`.
 *
 * Los colores de los gráficos se leen de las CSS vars del tema PrimeNG
 * (`ReddocPreset`) para alinear con el resto del ERP.
 */
@Component({
  selector: 'app-turno-inicio',
  standalone: true,
  imports: [ChartModule],
  templateUrl: './turno-inicio.component.html',
  styleUrl: './turno-inicio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnoInicioComponent implements OnInit {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly document = inject(DOCUMENT);
  private readonly analitica = inject(TurnoInicioService);
  private readonly locale = inject(LOCALE_ID);

  protected readonly t = this.i18n.t;

  // ── Estado de la carga ──────────────────────────────────────────────────
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  private readonly data = signal<AnaliticaHorasResponse | null>(null);

  /** ¿Es la primera carga (aún sin datos)? Decide spinner pleno vs atenuado. */
  protected readonly firstLoad = computed(() => this.loading() && this.data() === null);

  // ── Presets de rango ──────────────────────────────────────────────────────
  protected readonly presets: readonly PresetOption[] = [
    { id: 'esteMes', labelKey: 'esteMes' },
    { id: 'mesPasado', labelKey: 'mesPasado' },
    { id: 'ultimosTresMeses', labelKey: 'ultimosTresMeses' },
    { id: 'esteAnio', labelKey: 'esteAnio' },
  ];
  protected readonly selectedPreset = signal<RangePreset>('esteMes');

  /** Paleta derivada del tema (con fallback al brand navy/sky). */
  private readonly palette = this.readThemePalette();

  ngOnInit(): void {
    this.load();
  }

  /** Cambia el preset activo y recarga (ignora si ya está activo o cargando). */
  protected selectPreset(id: RangePreset): void {
    if (this.loading() || id === this.selectedPreset()) return;
    this.selectedPreset.set(id);
    this.load();
  }

  /** Carga la analítica para el preset activo. */
  private load(): void {
    const { fechaDesde, fechaHasta } = this.rangeForPreset(this.selectedPreset());
    this.loading.set(true);
    this.error.set(false);
    this.analitica.analiticaHoras(fechaDesde, fechaHasta).subscribe({
      next: (respuesta) => {
        this.data.set(respuesta);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[analitica-horas] error', err);
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  // ── KPIs ────────────────────────────────────────────────────────────────
  protected readonly kpis = computed<readonly KpiCard[]>(() => {
    const r = this.data()?.resumen;
    return [
      {
        labelKey: 'horasPlaneadas',
        value: this.formatHoras(r?.horas_planeadas),
        iconClass: 'pi pi-calendar',
      },
      {
        labelKey: 'horasEjecutadas',
        value: this.formatHoras(r?.horas_ejecutadas),
        iconClass: 'pi pi-check-circle',
      },
      {
        labelKey: 'cumplimiento',
        value: this.formatPorcentaje(r?.cumplimiento ?? null),
        iconClass: 'pi pi-chart-line',
      },
      {
        labelKey: 'desviacion',
        value: this.formatHoras(r?.desviacion),
        iconClass: 'pi pi-arrows-v',
      },
    ];
  });

  // ── Gráfico de horas por jornada (barras planeadas vs ejecutadas) ─────────
  protected readonly jornadaData = computed(() => {
    const r = this.data()?.resumen;
    const series = this.t().turnoInicio.series;
    return {
      labels: [series.diurnas, series.nocturnas],
      datasets: [
        {
          label: series.planeadas,
          data: [r?.diurnas.planeadas ?? 0, r?.nocturnas.planeadas ?? 0],
          backgroundColor: this.palette.accent,
          borderRadius: 6,
        },
        {
          label: series.ejecutadas,
          data: [r?.diurnas.ejecutadas ?? 0, r?.nocturnas.ejecutadas ?? 0],
          backgroundColor: this.palette.primary,
          borderRadius: 6,
        },
      ],
    };
  });

  // ── Gráfico de tendencia (línea planeadas vs ejecutadas por periodo) ──────
  protected readonly hasSerie = computed(() => (this.data()?.serie.length ?? 0) > 0);

  protected readonly tendenciaData = computed(() => {
    const serie = this.data()?.serie ?? [];
    const series = this.t().turnoInicio.series;
    return {
      labels: serie.map((p) => p.periodo),
      datasets: [
        {
          label: series.planeadas,
          data: serie.map((p) => p.planeadas),
          borderColor: this.palette.accent,
          backgroundColor: 'transparent',
          tension: 0.4,
          pointBackgroundColor: this.palette.accent,
        },
        {
          label: series.ejecutadas,
          data: serie.map((p) => p.ejecutadas),
          borderColor: this.palette.primary,
          backgroundColor: this.palette.primarySoft,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: this.palette.primary,
        },
      ],
    };
  });

  protected readonly barOptions = this.buildAxisOptions();
  protected readonly lineOptions = this.buildAxisOptions();

  /** Opciones comunes de los gráficos con ejes (barras y línea). */
  private buildAxisOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: { color: this.palette.text, usePointStyle: true, padding: 16 },
        },
      },
      scales: {
        x: {
          ticks: { color: this.palette.muted },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: this.palette.muted },
          grid: { color: this.palette.grid },
        },
      },
    };
  }

  /** Formatea horas con el locale de la app (1 decimal máx, sin ceros sobrantes). */
  private formatHoras(value: number | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat(this.locale, { maximumFractionDigits: 1 }).format(value);
  }

  /** Cumplimiento como porcentaje; guion cuando el backend devuelve `null`. */
  private formatPorcentaje(value: number | null): string {
    if (value == null) return '—';
    return `${new Intl.NumberFormat(this.locale, { maximumFractionDigits: 1 }).format(value)}%`;
  }

  /**
   * Calcula el rango `[fechaDesde, fechaHasta]` (AAAA-MM-DD) de un preset.
   *
   * Usa `toIsoDate` (partes locales) en lugar de `toISOString()` para no correr
   * el día por zona horaria (Colombia es UTC-5).
   */
  private rangeForPreset(preset: RangePreset): { fechaDesde: string; fechaHasta: string } {
    const hoy = startOfToday();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth();

    switch (preset) {
      case 'esteMes':
        return { fechaDesde: toIsoDate(new Date(anio, mes, 1)), fechaHasta: toIsoDate(hoy) };
      case 'mesPasado':
        // Día 0 del mes actual = último día del mes anterior.
        return {
          fechaDesde: toIsoDate(new Date(anio, mes - 1, 1)),
          fechaHasta: toIsoDate(new Date(anio, mes, 0)),
        };
      case 'ultimosTresMeses':
        return { fechaDesde: toIsoDate(new Date(anio, mes - 2, 1)), fechaHasta: toIsoDate(hoy) };
      case 'esteAnio':
        return { fechaDesde: toIsoDate(new Date(anio, 0, 1)), fechaHasta: toIsoDate(hoy) };
    }
  }

  /** Lee colores del tema PrimeNG con fallback al brand navy/sky. */
  private readThemePalette() {
    const styles = getComputedStyle(this.document.documentElement);
    const read = (name: string, fallback: string): string =>
      styles.getPropertyValue(name).trim() || fallback;

    return {
      primary: read('--p-primary-color', '#143049'),
      primarySoft: read('--p-primary-100', 'rgba(20, 48, 73, 0.12)'),
      accent: read('--p-primary-300', '#77aad7'),
      text: read('--p-text-color', '#1f2937'),
      muted: read('--p-text-muted-color', '#6b7280'),
      grid: read('--p-content-border-color', 'rgba(0, 0, 0, 0.06)'),
    };
  }
}
