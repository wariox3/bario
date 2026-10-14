import { type AbstractControl, type AsyncValidatorFn, type ValidationErrors } from '@angular/forms';
import { type Observable, catchError, map, of, switchMap, timer } from 'rxjs';

/** Consulta al backend si ya existe un contacto con esa identificación (`contacto/validar/`). */
export type ValidarIdentificacion = (data: {
  readonly identificacion_id: number;
  readonly numero_identificacion: string;
}) => Observable<{ readonly existe: boolean }>;

/** Combinación que identifica únicamente a un contacto en el backend. */
export interface NumeroIdentificacionSnapshot {
  readonly numero_identificacion: string;
  readonly identificacion_id: number;
}

/**
 * Async validator que consulta al backend si la combinación
 * `(identificacion_id, numero_identificacion)` ya está registrada en otro
 * contacto.
 *
 * - Devuelve `null` (válido) si falta cualquiera de los dos datos.
 * - En edición, si `getOriginal()` devuelve un snapshot y ni el número ni el
 *   tipo cambiaron, no consulta el backend (replica el comportamiento legacy).
 * - Aplica debounce con `timer(debounceMs)` + `switchMap`: las emisiones nuevas
 *   cancelan la consulta anterior automáticamente.
 * - Si la red falla, no rompe el formulario: trata el campo como válido.
 *
 * El validator se inyecta como factory para mantener la lógica testeable sin
 * Angular y reusable si en el futuro se necesita en otro form.
 */
export function numeroIdentificacionUnicoValidator(
  validar: ValidarIdentificacion,
  getIdentificacionId: () => number | null,
  getOriginal: () => NumeroIdentificacionSnapshot | null,
  debounceMs = 300,
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const numero = (control.value ?? '') as string;
    const identificacionId = getIdentificacionId();

    if (!numero || identificacionId === null) return of(null);

    const original = getOriginal();
    if (
      original &&
      original.numero_identificacion === numero &&
      original.identificacion_id === identificacionId
    ) {
      return of(null);
    }

    return timer(debounceMs).pipe(
      switchMap(() =>
        validar({
          identificacion_id: identificacionId,
          numero_identificacion: numero,
        }),
      ),
      map((res) => (res.existe ? { numeroIdentificacionExistente: true } : null)),
      catchError(() => of(null)),
    );
  };
}
