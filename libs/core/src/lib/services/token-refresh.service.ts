import { Injectable, signal } from '@angular/core';
import { Observable, catchError, defaultIfEmpty, map, of, shareReplay, take } from 'rxjs';

/**
 * Un único refresh de sesión en curso, compartido por todas las peticiones que
 * recibieron 401 mientras tanto.
 *
 * El refresh **no le pertenece a la petición que lo disparó**: corre con
 * `shareReplay({ refCount: false })`, así que si esa petición se cancela (la
 * pantalla se destruye y `takeUntilDestroyed` se desuscribe, un `switchMap`
 * relanza la búsqueda) el `POST /refresh/` sigue y su resultado llega igual a
 * las demás. Antes el estado vivía en un flag + `Subject`: cancelar a mitad
 * dejaba el flag en `true` para siempre y cada 401 posterior esperaba un
 * resultado que nunca llegaba — la pantalla quedaba cargando sin redirigir.
 */
@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private readonly _refreshing = signal(false);
  private enCurso: Observable<boolean> | null = null;

  readonly isRefreshing = this._refreshing.asReadonly();

  get refreshing(): boolean {
    return this._refreshing();
  }

  /**
   * Renueva la sesión, o se suma al refresh que ya está en curso.
   *
   * Emite `true` si la sesión se renovó y `false` si no; nunca falla. `alFallar`
   * corre una sola vez por refresh fallido, no una por cada petición que esperaba.
   */
  renovar(refresh: () => Observable<unknown>, alFallar: () => void): Observable<boolean> {
    if (this.enCurso) return this.enCurso;

    // El estado se libera al tener el resultado y antes de emitirlo: quien lo
    // recibe ya ve `refreshing === false`, y un 401 posterior arranca otro refresh.
    const terminar = () => {
      if (this.enCurso === enCurso) this.reset();
    };

    this._refreshing.set(true);
    const enCurso: Observable<boolean> = refresh().pipe(
      defaultIfEmpty(undefined),
      take(1),
      map(() => {
        terminar();
        return true;
      }),
      catchError(() => {
        terminar();
        alFallar();
        return of(false);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.enCurso = enCurso;
    return enCurso;
  }

  reset(): void {
    this.enCurso = null;
    this._refreshing.set(false);
  }
}
