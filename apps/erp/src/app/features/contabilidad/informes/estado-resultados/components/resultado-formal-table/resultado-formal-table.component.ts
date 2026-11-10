import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService, formatCop, formatFechaCorta, toFiniteNumber } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { InformeEmptyCopySet } from '../../../../shared/movimiento-informe.types';
import type {
  ResultadoFormal,
  ResultadoFormalFila,
  ResultadoFormalFilaTipo,
} from '../../estado-resultados.types';
import { formatPorcentaje } from '../../estado-resultados.utils';

const ESTILO_FILA: Readonly<Record<ResultadoFormalFilaTipo, string>> = {
  SECCION: 'bg-[rgba(19,38,60,0.035)] font-semibold text-[var(--brand-navy)]',
  CUENTA: '',
  TOTAL: 'font-semibold',
  UTILIDAD: 'bg-[rgba(19,38,60,0.055)] font-bold text-[var(--brand-navy)]',
};

interface CeldaVm {
  readonly texto: string;
  readonly perdida: boolean;
}

/** Vacío si no hay importe: las filas `SECCION` no traen ninguno. */
function monto(value: string | null): string {
  return value === null ? '' : formatCop(value);
}

/** En una utilidad, un importe negativo es pérdida: se resalta. */
function celdaDeCorte(fila: ResultadoFormalFila, value: string | null): CeldaVm {
  return {
    texto: monto(value),
    perdida: fila.tipo === 'UTILIDAD' && (toFiniteNumber(value) ?? 0) < 0,
  };
}

/**
 * Presentación **formal** del estado de resultados: secciones, subtotales y
 * utilidades contra el mismo rango del año anterior. `tipo` decide cómo se pinta
 * cada fila. Componente tonto; va aparte de `<app-movimiento-informe-table>`
 * porque no comparte ni columnas ni jerarquía con los informes de esa familia.
 */
@Component({
  selector: 'app-resultado-formal-table',
  standalone: true,
  host: { class: 'flex min-h-0 flex-1 flex-col overflow-hidden' },
  template: `
    @let d = t().entities.estadoResultados.formal;
    @let e = informe().encabezado;

    <p class="m-0 px-3 py-2 text-[0.82rem] font-semibold text-[var(--brand-navy)]">
      {{ e.empresa }}
    </p>
    <div class="min-h-0 flex-1 overflow-auto" [class.opacity-55]="loading()">
      <table class="w-full border-collapse text-[0.82rem]">
        <thead>
          <tr>
            <th [class]="th + ' w-32 text-left'" scope="col">{{ d.columns.codigo }}</th>
            <th [class]="th + ' min-w-[13rem] text-left'" scope="col">{{ d.columns.nombre }}</th>
            <th [class]="th + ' w-44 text-right'" scope="col">
              {{ d.columns.actual }}
              <span class="block font-normal normal-case tracking-normal">
                {{ rango(e.fecha_desde, e.fecha_hasta) }}
              </span>
            </th>
            <th [class]="th + ' w-44 text-right'" scope="col">
              {{ d.columns.anterior }}
              <span class="block font-normal normal-case tracking-normal">
                {{ rango(e.fecha_desde_anterior, e.fecha_hasta_anterior) }}
              </span>
            </th>
            <th [class]="th + ' w-36 text-right'" scope="col">{{ d.columns.variacion }}</th>
            <th [class]="th + ' w-24 text-right'" scope="col">{{ d.columns.porcentaje }}</th>
          </tr>
        </thead>
        <tbody>
          @for (fila of filas(); track $index) {
            <tr [class]="fila.estilo">
              <td
                class="whitespace-nowrap border-b border-[rgba(19,38,60,0.06)] px-3 py-[0.55rem] tabular-nums"
              >
                {{ fila.codigo }}
              </td>
              <td class="border-b border-[rgba(19,38,60,0.06)] px-3 py-[0.55rem]">
                {{ fila.nombre }}
              </td>
              @for (celda of fila.celdas; track $index) {
                <td
                  class="whitespace-nowrap border-b border-[rgba(19,38,60,0.06)] px-3 py-[0.55rem] text-right tabular-nums"
                  [class.text-red-700]="celda.perdida"
                >
                  {{ celda.texto }}
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td colspan="6" class="px-4 py-16 text-center">
                <i class="pi pi-inbox text-3xl text-[var(--brand-muted,#64748b)] opacity-50"></i>
                <p class="mb-1 mt-3 font-semibold text-[var(--brand-navy)]">
                  {{ empty().noData.title }}
                </p>
                <p class="m-0 text-[var(--brand-muted,#64748b)]">{{ empty().noData.sub }}</p>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultadoFormalTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly informe = input.required<ResultadoFormal>();
  readonly empty = input.required<InformeEmptyCopySet>();
  readonly loading = input<boolean>(false);

  protected readonly th =
    'sticky top-0 z-[1] whitespace-nowrap bg-[#f8f9fa] px-3 py-[0.6rem] text-[0.66rem] font-bold ' +
    'uppercase tracking-[0.04em] text-[var(--brand-muted,#64748b)] ' +
    'shadow-[inset_0_-1px_0_rgba(19,38,60,0.1)]';

  protected readonly filas = computed(() =>
    this.informe().filas.map((fila) => ({
      codigo: fila.codigo,
      nombre: fila.nombre,
      estilo: ESTILO_FILA[fila.tipo] ?? '',
      celdas: [
        celdaDeCorte(fila, fila.actual),
        celdaDeCorte(fila, fila.anterior),
        { texto: monto(fila.variacion), perdida: false },
        { texto: formatPorcentaje(fila.porcentaje), perdida: false },
      ] satisfies readonly CeldaVm[],
    })),
  );

  protected rango(desde: string, hasta: string): string {
    return `${formatFechaCorta(desde)} – ${formatFechaCorta(hasta)}`;
  }
}
