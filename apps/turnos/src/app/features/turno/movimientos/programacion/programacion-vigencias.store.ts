import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { DocumentoDetalleService } from '@reddoc/core';
import type { ProgramacionLineaRead, ProgramacionVigencia } from './programacion.model';
import { vigenciaDe } from './programacion.utils';

/**
 * Estado de las **vigencias por línea** (`documento_detalle_id → rango`): carga la
 * línea de documento de cada id (`GET documento-detalle/:id/`) y deriva su vigencia
 * (`fecha_desde`..`fecha_hasta`) con la misma regla del período
 * (`ProgramacionPeriodoStore`): rango solo con ambos extremos.
 *
 * Existe porque el detalle de programación (grid) no trae las fechas de la línea:
 * los modales de edición (una banda por línea) lo usan para bloquear los días fuera
 * del rango — la misma lógica de negocio que `agregar-contrato` resuelve con su GET
 * único. Una línea que falla degrada a `null` (sin bloqueo) y avisa por `onError`.
 *
 * Se provee a nivel del modal (`providers: [ProgramacionVigenciasStore]`), así su
 * estado vive y muere con el componente.
 */
@Injectable()
export class ProgramacionVigenciasStore {
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _vigencias = signal<ReadonlyMap<number, ProgramacionVigencia | null>>(new Map());
  private readonly _cargando = signal(false);

  /** Vigencia por `documento_detalle_id` (`null` = la línea no acota rango). */
  readonly vigencias = this._vigencias.asReadonly();

  /** `true` mientras se resuelven las líneas. */
  readonly cargando = this._cargando.asReadonly();

  /** Limpia el mapa (al cerrar/reabrir el modal para otro contexto). */
  reset(): void {
    this._vigencias.set(new Map());
  }

  /**
   * Carga la vigencia de cada línea (ids deduplicados) y **reemplaza** el mapa al
   * resolver — cada apertura del modal trae el rango fresco, igual que
   * `cargarDesdeLinea` en el modal de agregar contrato. Una línea que falla queda
   * `null` (degradado seguro: sin bloqueo) y se invoca `onError` una sola vez;
   * el feedback (toast) es del consumidor para no acoplar el store a la UI.
   */
  cargar(documentoDetalleIds: readonly number[], onError?: () => void): void {
    const ids = [...new Set(documentoDetalleIds)];
    if (ids.length === 0) {
      this._vigencias.set(new Map());
      return;
    }

    let huboError = false;
    this._cargando.set(true);
    forkJoin(
      ids.map((id) =>
        this.detalleService.obtenerPorId<ProgramacionLineaRead>(id).pipe(
          map((linea) => [id, vigenciaDe(linea.fecha_desde, linea.fecha_hasta)] as const),
          catchError(() => {
            huboError = true;
            return of([id, null] as const);
          }),
        ),
      ),
    )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this._cargando.set(false)),
      )
      .subscribe((entradas) => {
        this._vigencias.set(new Map(entradas));
        if (huboError) onError?.();
      });
  }
}
