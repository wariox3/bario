import { DestroyRef, effect, signal, type Signal } from '@angular/core';
import type { FormGroup } from '@angular/forms';

export interface EstadoPendientes {
  /** `true` desde el primer submit que no pasó la validación. */
  readonly intentado: Signal<boolean>;
  /** Cambia con cada transición de estado del form; despierta a quien relee el DOM. */
  readonly version: Signal<number>;
}

/**
 * Estado que comparten el contador de la barra y los badges de sección: cuándo
 * se intentó guardar, y cuándo hay que volver a mirar.
 *
 * **El intento se detecta en el `submit` del `<form>`**, no se lo pedimos a la
 * página. Así sumar cualquiera de los dos a un formulario es una línea de HTML
 * y no hay un tercer signal que mantener sincronizado a mano.
 *
 * La lectura va diferida un microtask: el handler del formulario todavía tiene
 * que correr su `markAllAsTouched()`, y adelantarse dejaría los campos sin su
 * mensaje de error justo cuando los estamos señalando.
 *
 * @param alFallar Se llama cuando el intento se fue en blanco, ya con el estado
 *   actualizado. Lo usa el contador para saltar al primer pendiente.
 */
export function seguirIntentos(
  form: () => FormGroup,
  formEl: HTMLFormElement | null,
  destroyRef: DestroyRef,
  alFallar?: () => void,
): EstadoPendientes {
  const intentado = signal(false);
  const version = signal(0);

  const alIntentar = (): void => {
    queueMicrotask(() => {
      if (form().valid) return;
      intentado.set(true);
      version.update((v) => v + 1);
      alFallar?.();
    });
  };

  formEl?.addEventListener('submit', alIntentar);
  destroyRef.onDestroy(() => formEl?.removeEventListener('submit', alIntentar));

  // El `FormGroup` llega por input: la suscripción se rearma sola si la página
  // lo reemplaza, y el cleanup corre también al destruir.
  effect((onCleanup) => {
    const sub = form().statusChanges.subscribe(() => version.update((v) => v + 1));
    onCleanup(() => sub.unsubscribe());
  });

  return { intentado, version };
}
