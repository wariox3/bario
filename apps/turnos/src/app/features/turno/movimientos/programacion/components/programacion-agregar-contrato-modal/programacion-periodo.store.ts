import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { anioMesDeIso, diasDelMes } from '@reddoc/core';
import { DocumentoDetalleService } from '@reddoc/core';
import { FestivoService, type Festivo } from '../../festivo.service';
import type { ProgramacionLineaRead } from '../../programacion.model';

/** Período (mes/año) a programar, ya con su etiqueta legible para el header. */
export interface ProgramacionPeriodo {
  readonly anio: number;
  readonly mes: number;
  /** Nombre del mes + año (`junio de 2026`) para mostrar en el header. */
  readonly etiqueta: string;
}

/** `junio de 2026` a partir de año + mes (1-based). */
function etiquetaMes(anio: number, mes: number): string {
  return new Date(anio, mes - 1, 1).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Estado del **período programable** del modal de agregar contrato: deriva el
 * mes/año a programar de la línea del documento (su `fecha_desde`), trae los
 * festivos de ese mes y expone los días y el mapa de festivos ya calculados.
 *
 * Aísla la lógica de calendario del componente (form + submit). Se provee a
 * nivel del modal (`providers: [ProgramacionPeriodoStore]`), así su estado y
 * suscripciones viven y mueren con el modal.
 */
@Injectable()
export class ProgramacionPeriodoStore {
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly festivoService = inject(FestivoService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _periodo = signal<ProgramacionPeriodo | null>(null);
  private readonly _cargando = signal(false);
  private readonly _festivos = signal<readonly Festivo[]>([]);
  private readonly _generado = signal(false);

  /** Período resuelto (`null` mientras carga o si la línea no trae fecha). */
  readonly periodo = this._periodo.asReadonly();

  /** `true` mientras se resuelve el período (carga de la línea de documento). */
  readonly cargando = this._cargando.asReadonly();

  /**
   * `true` si la línea ya tiene la programación generada (materializada). Lo lee
   * el modal de prototipo para alternar el botón entre generar y desgenerar.
   */
  readonly generado = this._generado.asReadonly();

  /**
   * Días del período (1..N) con la inicial del día de la semana. Vacío mientras
   * no hay período; define columnas del header y cantidad de inputs.
   */
  readonly dias = computed(() => {
    const p = this._periodo();
    return p ? diasDelMes(p.anio, p.mes) : [];
  });

  /**
   * Días del mes (1..N) que son festivos → su nombre, para resaltarlos. Un
   * festivo que cae sábado no se marca (queda como fin de semana).
   */
  readonly festivoPorDia = computed<ReadonlyMap<number, string>>(() => {
    const mapa = new Map<number, string>();
    const p = this._periodo();
    if (!p) return mapa;
    for (const f of this._festivos()) {
      const [anio, mes, dia] = f.fecha.split('-').map(Number);
      if (anio !== p.anio || mes !== p.mes) continue;
      if (new Date(anio, mes - 1, dia).getDay() === 6) continue;
      mapa.set(dia, f.nombre);
    }
    return mapa;
  });

  /** Limpia el período, sus festivos y el flag de generado (al reabrir el modal). */
  reset(): void {
    this._periodo.set(null);
    this._festivos.set([]);
    this._generado.set(false);
  }

  /**
   * Carga la línea de documento (`documento_detalle_id`) y deriva el período de
   * su `fecha_desde`; al resolver, trae los festivos del mes. `onError` deja el
   * feedback (toast) al consumidor para no acoplar el store a la UI.
   */
  cargarDesdeLinea(documentoDetalleId: number, onError?: () => void): void {
    this._cargando.set(true);
    this.detalleService
      .obtenerPorId<ProgramacionLineaRead>(documentoDetalleId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this._cargando.set(false)),
      )
      .subscribe({
        next: (linea) => {
          // El flag de generado se conserva aunque la línea no traiga fecha.
          this._generado.set(linea.generado);
          const ym = anioMesDeIso(linea.fecha_desde);
          if (!ym) {
            this._periodo.set(null);
            this._festivos.set([]);
            return;
          }
          this._periodo.set({ ...ym, etiqueta: etiquetaMes(ym.anio, ym.mes) });
          this.cargarFestivos(ym.anio, ym.mes);
        },
        error: () => {
          this.reset();
          onError?.();
        },
      });
  }

  private cargarFestivos(anio: number, mes: number): void {
    this.festivoService
      .getDelMes(anio, mes)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (festivos) => this._festivos.set(festivos),
        error: () => this._festivos.set([]),
      });
  }
}
