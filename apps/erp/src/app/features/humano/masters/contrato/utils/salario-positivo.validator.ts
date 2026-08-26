import type { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * El salario de un contrato tiene que ser mayor que cero.
 *
 * `Validators.required` no alcanza: `0` es un valor presente, así que pasaba la
 * validación y el contrato se guardaba sin remuneración. `Validators.min(1)`
 * tampoco sirve — rechazaría un valor entre 0 y 1 mostrando un mensaje que dice
 * "mayor que cero", que es justo lo que ese valor cumple.
 *
 * Un valor vacío no es asunto de acá: de eso se ocupa `required`, y devolver dos
 * errores por el mismo campo solo hace que el usuario lea el que no le sirve.
 */
export function salarioPositivo(control: AbstractControl): ValidationErrors | null {
  const valor: unknown = control.value;
  if (valor == null || valor === '') return null;
  return typeof valor === 'number' && valor > 0 ? null : { salarioPositivo: true };
}
