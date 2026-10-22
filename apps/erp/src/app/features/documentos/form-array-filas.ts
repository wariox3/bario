import type { AbstractControl, FormArray } from '@angular/forms';

/**
 * Agrega varias filas a un `FormArray` con **un solo** `valueChanges`.
 *
 * Un `push` por fila emite una vez por fila, y cada emisión hace que la tabla
 * que escucha el array relea todo su valor y recablee sus filas: cargar un
 * documento de 99 líneas costaba 99 vueltas completas. Acá cada `push` va en
 * silencio y el array avisa una sola vez al final, también al form padre.
 */
export function agregarFilas<G extends AbstractControl>(
  array: FormArray<G>,
  filas: readonly G[],
): void {
  if (filas.length === 0) return;
  for (const fila of filas) array.push(fila, { emitEvent: false });
  array.updateValueAndValidity();
}

/**
 * Reemplaza todas las filas del array por `filas`, con un solo `valueChanges`.
 * Avisa aunque `filas` venga vacío: quien escucha tiene que enterarse de que el
 * array quedó sin líneas.
 */
export function reemplazarFilas<G extends AbstractControl>(
  array: FormArray<G>,
  filas: readonly G[],
): void {
  array.clear({ emitEvent: false });
  for (const fila of filas) array.push(fila, { emitEvent: false });
  array.updateValueAndValidity();
}
