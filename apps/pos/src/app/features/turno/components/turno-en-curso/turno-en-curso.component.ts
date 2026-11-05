import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@pos/i18n';
import { duracion, formatFechaHora, formatPesos } from '../../turno.format';
import type { Turno, TurnoResumen } from '../../turno.model';

/** Cada cuánto se refresca el tiempo corrido: el tablero muestra minutos. */
const TIC_MS = 30_000;

export type EstadoResumen = 'cargando' | 'listo' | 'error';

/**
 * Tablero del turno en curso, sobre el listado. Arriba quién y dónde, con las
 * acciones del turno; abajo, a la izquierda lo vendido y desde cuándo corre, y
 * a la derecha lo que debe haber en cada cuenta al cerrar (`resumen/`), que es
 * lo que el cajero va a contar: por eso se lee como un tiquete.
 *
 * Tonto: el resumen y la impresión los maneja la página.
 */
@Component({
  selector: 'app-turno-en-curso',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './turno-en-curso.component.html',
})
export class TurnoEnCursoComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly turno = input.required<Turno>();
  readonly resumen = input<TurnoResumen | null>(null);
  readonly estadoResumen = input<EstadoResumen>('cargando');
  readonly imprimiendo = input(false);

  readonly imprimir = output<void>();
  readonly recargarResumen = output<void>();

  private readonly ahora = signal(Date.now());

  protected readonly desde = computed(() => formatFechaHora(this.turno().fecha_apertura));
  protected readonly base = computed(() => formatPesos(this.turno().base));
  protected readonly corrido = computed(() => duracion(this.turno().fecha_apertura, this.ahora()));
  /** `Caja 1 · Principal · Laura Gómez`, sin separador colgando si falta algo. */
  protected readonly lugar = computed(() => {
    const t = this.turno();
    return [t.caja_nombre, t.caja_sede_nombre, t.usuario_nombre_corto].filter(Boolean).join(' · ');
  });

  protected readonly totalVenta = computed(() => {
    const r = this.resumen();
    return r ? formatPesos(r.total_venta) : '';
  });
  protected readonly ventasTexto = computed(() => {
    const n = this.resumen()?.cantidad_documentos ?? 0;
    const tx = this.t().turno.enCurso;
    return n === 1 ? tx.unaVenta : tx.ventas.replace('{n}', n.toLocaleString('es-CO'));
  });
  protected readonly cuentas = computed(() =>
    (this.resumen()?.cuentas ?? []).map((c) => ({
      id: c.cuenta_banco,
      nombre: c.cuenta_banco_nombre,
      esperado: formatPesos(c.esperado),
      esBase: c.cuenta_banco === this.turno().cuenta_banco,
    })),
  );
  protected readonly totalEsperado = computed(() =>
    formatPesos((this.resumen()?.cuentas ?? []).reduce((s, c) => s + Number(c.esperado), 0)),
  );

  constructor() {
    const tic = setInterval(() => this.ahora.set(Date.now()), TIC_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(tic));
  }
}
