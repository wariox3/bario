import { Component, computed, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@pos/i18n';
import { cuadreDe, formatPesos } from '../../turno.format';
import type { TurnoConDetalles } from '../../turno.model';

/**
 * Acuse del cierre, en el lugar donde estaba el tablero: qué turno se cerró,
 * cuánto se contó contra lo esperado y si cuadró. Desde aquí se imprime el
 * cierre; se descarta a mano o al abrir otro turno.
 */
@Component({
  selector: 'app-turno-cerrado',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './turno-cerrado.component.html',
})
export class TurnoCerradoComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly turno = input.required<TurnoConDetalles>();
  readonly imprimiendo = input(false);

  readonly imprimir = output<void>();
  readonly descartar = output<void>();

  private readonly totales = computed(() =>
    this.turno().detalles.reduce(
      (acc, d) => ({
        esperado: acc.esperado + Number(d.esperado),
        contado: acc.contado + Number(d.contado),
        diferencia: acc.diferencia + Number(d.diferencia),
      }),
      { esperado: 0, contado: 0, diferencia: 0 },
    ),
  );

  protected readonly cuadre = computed(() =>
    cuadreDe(Math.round(this.totales().diferencia * 100) / 100),
  );

  protected readonly titulo = computed(() => {
    const t = this.turno();
    return this.t()
      .turno.cerrado.title.replace('{id}', String(t.id))
      .replace('{caja}', t.caja_nombre ?? '');
  });

  protected readonly detalle = computed(() => {
    const tx = this.t().turno.cerrado;
    const { esperado, contado, diferencia } = this.totales();
    const base = tx.contaste
      .replace('{contado}', formatPesos(contado))
      .replace('{esperado}', formatPesos(esperado));
    switch (this.cuadre()) {
      case 'cuadra':
        return `${base} ${tx.cuadro}`;
      case 'falta':
        return `${base} ${tx.faltaron.replace('{monto}', formatPesos(Math.abs(diferencia)))}`;
      default:
        return `${base} ${tx.sobraron.replace('{monto}', formatPesos(diferencia))}`;
    }
  });
}
