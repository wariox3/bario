import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { Popover, PopoverModule } from 'primeng/popover';
import { I18nService, startOfToday, toIsoDate } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import {
  localeDe,
  rotuloPeriodo,
  trimestreDe,
} from '@erp/features/documentos/resumen-periodo/resumen-periodo';

export type ModoMesSelector = 'mes' | 'trimestre';

interface CeldaMes {
  readonly mes: number;
  readonly corto: string;
  readonly largo: string;
  readonly elegida: boolean;
  readonly actual: boolean;
  readonly futura: boolean;
}

interface FilaTrimestre {
  readonly trimestre: number;
  readonly rotulo: string;
  readonly meses: readonly CeldaMes[];
  readonly elegida: boolean;
  readonly actual: boolean;
  readonly futura: boolean;
}

/** Cuatro filas de tres meses: cada fila es un trimestre, en los dos modos. */
const TRIMESTRES = [0, 1, 2, 3] as const;
const MESES_POR_TRIMESTRE = [0, 1, 2] as const;

/**
 * Elige el mes o el trimestre de una gráfica. La grilla es la misma en los dos
 * modos porque el año contable ya se lee así: cada fila es un trimestre. En modo
 * mes se elige la celda; en modo trimestre, la fila entera.
 *
 * Va en `p-popover` y no en un panel propio: la card que lo aloja recorta con
 * `overflow-hidden`. Lo que aún no llega no se puede elegir; el trimestre en
 * curso sí, aunque le falten meses, porque el rango llega hasta el cierre.
 */
@Component({
  selector: 'app-mes-selector',
  standalone: true,
  imports: [PopoverModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let tx = t().inicio.estadoResultados.selectorMes;
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(20,48,73,0.12)] bg-brand-surface px-3 text-[0.78rem] font-medium text-brand-text transition-colors hover:bg-[rgba(20,48,73,0.04)]"
      aria-haspopup="dialog"
      [attr.aria-label]="(modo() === 'mes' ? tx.elegirMes : tx.elegirTrimestre) + ': ' + rotulo()"
      (click)="abrir(panel, $event)"
    >
      <i class="pi pi-calendar text-[0.72rem] text-brand-muted" aria-hidden="true"></i>
      <span class="inline-block first-letter:uppercase">{{ rotulo() }}</span>
      <i class="pi pi-chevron-down text-[0.6rem] text-brand-muted" aria-hidden="true"></i>
    </button>

    <p-popover #panel>
      <div class="flex w-56 flex-col gap-2">
        <div class="flex items-center justify-between">
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-md text-brand-muted transition-colors hover:bg-[rgba(20,48,73,0.04)] hover:text-brand-text"
            [attr.aria-label]="tx.anioAnterior"
            (click)="moverAnio(-1)"
          >
            <i class="pi pi-chevron-left text-[0.7rem]" aria-hidden="true"></i>
          </button>
          <span class="text-[0.82rem] font-semibold tabular-nums text-brand-text">
            {{ anioVisible() }}
          </span>
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-md text-brand-muted transition-colors enabled:hover:bg-[rgba(20,48,73,0.04)] enabled:hover:text-brand-text disabled:cursor-not-allowed disabled:opacity-40"
            [attr.aria-label]="tx.anioSiguiente"
            [disabled]="anioVisible() >= anioHoy"
            (click)="moverAnio(1)"
          >
            <i class="pi pi-chevron-right text-[0.7rem]" aria-hidden="true"></i>
          </button>
        </div>

        <div class="flex flex-col gap-0.5">
          @for (fila of filas(); track fila.trimestre) {
            @if (modo() === 'trimestre') {
              <button
                type="button"
                class="grid h-8 grid-cols-3 items-center rounded-md text-center text-[0.78rem] transition-colors"
                [class]="claseCelda(fila)"
                [attr.aria-label]="fila.rotulo"
                [attr.aria-pressed]="fila.elegida"
                [disabled]="fila.futura"
                (click)="elegirTrimestre(fila.trimestre, panel)"
              >
                @for (celda of fila.meses; track celda.mes) {
                  <span>{{ celda.corto }}</span>
                }
              </button>
            } @else {
              <div class="grid grid-cols-3 gap-0.5">
                @for (celda of fila.meses; track celda.mes) {
                  <button
                    type="button"
                    class="h-8 rounded-md text-center text-[0.78rem] transition-colors"
                    [class]="claseCelda(celda)"
                    [attr.aria-label]="celda.largo"
                    [attr.aria-pressed]="celda.elegida"
                    [disabled]="celda.futura"
                    (click)="elegirMes(celda.mes, panel)"
                  >
                    {{ celda.corto }}
                  </button>
                }
              </div>
            }
          }
        </div>
      </div>
    </p-popover>
  `,
})
export class MesSelectorComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Cualquier fecha del mes elegido; en modo trimestre, cualquiera del trimestre. */
  readonly mes = model.required<Date>();
  readonly modo = input<ModoMesSelector>('mes');

  private readonly hoy = startOfToday();
  protected readonly anioHoy = this.hoy.getFullYear();

  /** El año que se está hojeando: cambia sin elegir nada hasta tocar una celda. */
  protected readonly anioVisible = signal(this.anioHoy);

  private readonly locale = computed(() => localeDe(this.i18n.lang()));

  protected readonly rotulo = computed(() => {
    const mes = this.mes();
    return this.modo() === 'mes'
      ? rotuloPeriodo(toIsoDate(mes), 'mes', this.locale())
      : this.rotuloTrimestre(trimestreDe(mes), mes.getFullYear());
  });

  protected readonly filas = computed<readonly FilaTrimestre[]>(() => {
    const anio = this.anioVisible();
    const locale = this.locale();
    const corto = new Intl.DateTimeFormat(locale, { month: 'short' });
    const largo = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
    const elegido = this.mes();
    const anioElegido = elegido.getFullYear();
    const mesHoy = this.hoy.getMonth();

    const esFutura = (mes: number): boolean =>
      anio > this.anioHoy || (anio === this.anioHoy && mes > mesHoy);

    return TRIMESTRES.map((trimestre) => {
      const primerMes = trimestre * 3;
      return {
        trimestre,
        rotulo: this.rotuloTrimestre(trimestre, anio),
        meses: MESES_POR_TRIMESTRE.map((i) => {
          const mes = primerMes + i;
          const fecha = new Date(anio, mes, 1);
          return {
            mes,
            corto: corto.format(fecha).replace('.', ''),
            largo: largo.format(fecha),
            elegida: anio === anioElegido && mes === elegido.getMonth(),
            actual: anio === this.anioHoy && mes === mesHoy,
            futura: esFutura(mes),
          };
        }),
        elegida: anio === anioElegido && trimestre === trimestreDe(elegido),
        actual: anio === this.anioHoy && trimestre === trimestreDe(this.hoy),
        futura: esFutura(primerMes),
      };
    });
  });

  protected abrir(panel: Popover, event: Event): void {
    // Cada apertura vuelve al año de lo elegido, no al que se dejó hojeando.
    this.anioVisible.set(this.mes().getFullYear());
    panel.toggle(event);
  }

  protected moverAnio(delta: number): void {
    this.anioVisible.update((anio) => Math.min(anio + delta, this.anioHoy));
  }

  protected elegirMes(mes: number, panel: Popover): void {
    this.fijar(new Date(this.anioVisible(), mes, 1), false);
    panel.hide();
  }

  protected elegirTrimestre(trimestre: number, panel: Popover): void {
    this.fijar(new Date(this.anioVisible(), trimestre * 3, 1), true);
    panel.hide();
  }

  /** Volver a tocar lo mismo cierra el panel sin pedir de nuevo los datos. */
  private fijar(fecha: Date, porTrimestre: boolean): void {
    const actual = this.mes();
    const igual =
      fecha.getFullYear() === actual.getFullYear() &&
      (porTrimestre
        ? trimestreDe(fecha) === trimestreDe(actual)
        : fecha.getMonth() === actual.getMonth());
    if (!igual) this.mes.set(fecha);
  }

  private rotuloTrimestre(trimestre: number, anio: number): string {
    return this.t()
      .inicio.estadoResultados.trimestre.replace('{n}', String(trimestre + 1))
      .replace('{anio}', String(anio));
  }

  protected claseCelda(celda: {
    readonly elegida: boolean;
    readonly actual: boolean;
    readonly futura: boolean;
  }): string {
    if (celda.elegida) return 'bg-brand-navy font-semibold text-white';
    if (celda.futura) return 'cursor-not-allowed text-[rgba(20,48,73,0.25)]';
    const tinta = celda.actual ? 'font-semibold text-brand-navy' : 'text-brand-text';
    return `${tinta} hover:bg-[rgba(20,48,73,0.04)]`;
  }
}
