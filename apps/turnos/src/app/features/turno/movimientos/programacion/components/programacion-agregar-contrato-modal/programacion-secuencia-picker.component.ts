import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { type ErpSelectOption, I18nService, anioMesDeIso } from '@reddoc/core';
import type { AppDict } from '@turnos/i18n';
import {
  SecuenciaService,
  type SecuenciaMesCalculado,
} from '@turnos/features/turno/masters/secuencia/secuencia.service';
import type { Secuencia } from '@turnos/features/turno/masters/secuencia/secuencia.model';
import type { ProgramacionVigencia } from '../../programacion.model';
import type { ProgramacionPeriodo } from './programacion-periodo.store';

/** Una posición activa de la secuencia (con su código de turno) para el picker. */
interface PosicionSecuencia {
  readonly pos: number;
  readonly codigo: string;
}

/**
 * Picker de **secuencia**: dado una secuencia elegida y el período, muestra sus
 * posiciones iniciales, deja elegir una y calcula los turnos del mes
 * (`POST /turno/secuencia/calcular-mes/`). Emite el resultado por `calculado`
 * para que el modal lo vuelque en los inputs de día.
 *
 * Sub-feature autocontenido: dueño del detalle de la secuencia y de la posición
 * inicial elegida. El campo de selección de secuencia vive en el modal (padre) y
 * llega por el input `secuencia`.
 */
@Component({
  selector: 'app-programacion-secuencia-picker',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './programacion-secuencia-picker.component.html',
  styleUrl: './programacion-secuencia-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramacionSecuenciaPickerComponent {
  private readonly secuenciaService = inject(SecuenciaService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Secuencia elegida en el modal (o `null`). Al cambiar, recarga su detalle. */
  readonly secuencia = input<ErpSelectOption | null>(null);

  /** Período (mes/año) a calcular; sin él no se puede calcular. */
  readonly periodo = input<ProgramacionPeriodo | null>(null);

  /**
   * Vigencia (rango ISO) de la línea: acota el cálculo al subrango válido del mes
   * (`dia_desde`/`dia_hasta`). Sin vigencia se calcula el mes completo.
   */
  readonly vigencia = input<ProgramacionVigencia | null>(null);

  /** Emite los días calculados para que el modal los vuelque en la tabla. */
  readonly calculado = output<SecuenciaMesCalculado>();

  /** Detalle completo de la secuencia elegida (`getById`). */
  private readonly secuenciaDetalle = signal<Secuencia | null>(null);

  /** Posición inicial elegida en el picker (índice 1..dias). */
  protected readonly posicionInicial = signal<number | null>(null);

  protected readonly calculando = signal(false);

  /** Posiciones activas de la secuencia (1..dias) con su código, para el picker. */
  protected readonly posiciones = computed<readonly PosicionSecuencia[]>(() => {
    const s = this.secuenciaDetalle();
    if (!s || !s.dias) return [];
    const result: PosicionSecuencia[] = [];
    for (let i = 1; i <= s.dias; i++) {
      const codigo = s[`dia_${i}` as keyof Secuencia] as string | null;
      if (codigo !== null) result.push({ pos: i, codigo });
    }
    return result;
  });

  /** Para calcular: período + secuencia + posición inicial y sin cálculo en curso. */
  protected readonly puedeCalcular = computed(
    () =>
      this.periodo() !== null &&
      this.secuencia() !== null &&
      this.posicionInicial() !== null &&
      !this.calculando(),
  );

  constructor() {
    // Al cambiar la secuencia elegida, reiniciar la posición y traer su detalle.
    effect(() => this.cargarDetalle(this.secuencia()));
  }

  /** Selecciona una posición inicial haciendo clic en el picker. */
  protected onSeleccionar(pos: number): void {
    this.posicionInicial.set(pos);
  }

  /**
   * Calcula los turnos del mes a partir de la secuencia y la posición inicial y
   * emite el resultado (`calculado`) para que el modal lo vuelque en la tabla.
   */
  protected onCalcular(): void {
    const secuencia = this.secuencia();
    const posicionInicial = this.posicionInicial();
    const periodo = this.periodo();
    if (!secuencia || posicionInicial == null || !periodo || this.calculando()) return;

    const { anio, mes } = periodo;
    // `new Date(anio, mes, 0)` con `mes` 1-based da el último día del mes.
    const totalDias = new Date(anio, mes, 0).getDate();
    const vigencia = this.vigencia();

    this.calculando.set(true);
    this.secuenciaService
      .calcularMes({
        secuencia_id: secuencia.id,
        posicion_inicial: posicionInicial,
        anio,
        mes,
        dia_desde: this.diaDelMes(vigencia?.desde, anio, mes, 1),
        dia_hasta: this.diaDelMes(vigencia?.hasta, anio, mes, totalDias),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.calculando.set(false)),
      )
      .subscribe({
        next: (res) => this.calculado.emit(res),
        error: (err) => console.error('Error al calcular el mes de la secuencia', err),
      });
  }

  /**
   * Día del mes (1..N) de una fecha ISO cuando cae en el `anio`/`mes` dados; si no
   * (sin vigencia, o el extremo del rango vive en otro mes que el visible), devuelve
   * `fallback`. Así el subrango se recorta al mes que se está calculando: el `desde`
   * cae a `1` y el `hasta` al último día cuando el extremo queda fuera del mes.
   */
  private diaDelMes(iso: string | undefined, anio: number, mes: number, fallback: number): number {
    if (!iso) return fallback;
    const ym = anioMesDeIso(iso);
    if (!ym || ym.anio !== anio || ym.mes !== mes) return fallback;
    return Number(iso.slice(8, 10));
  }

  /**
   * Trae el detalle completo de la secuencia elegida (`GET /turno/secuencia/:id/`)
   * y reinicia la posición inicial. Sin selección, limpia el detalle.
   */
  private cargarDetalle(sel: ErpSelectOption | null): void {
    this.posicionInicial.set(null);
    if (!sel) {
      this.secuenciaDetalle.set(null);
      return;
    }
    this.secuenciaService
      .getById(sel.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (secuencia) => this.secuenciaDetalle.set(secuencia),
        error: () => this.secuenciaDetalle.set(null),
      });
  }
}
