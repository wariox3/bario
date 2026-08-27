import type { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Un monto de nómina tiene que ser mayor que cero.
 *
 * `Validators.required` no alcanza: `0` es un valor presente, así que pasa la
 * validación y el registro se guarda sin importe. `Validators.min(1)` tampoco
 * sirve — rechazaría un valor entre 0 y 1 mostrando un mensaje que dice "mayor
 * que cero", que es justo lo que ese valor cumple.
 *
 * Un valor vacío no es asunto de acá: de eso se ocupa `required`, y devolver dos
 * errores por el mismo campo solo hace que el usuario lea el que no le sirve.
 * Tampoco es asunto de acá el texto que no es número: `p-inputnumber` no deja
 * escribirlo y deja el control en `null`, que vuelve a caer en `required`.
 *
 * El mensaje lo pone cada pantalla —"el salario", "el valor"— mapeando la clave
 * `montoPositivo` en su `<lib-field-error>`.
 */
export function montoPositivo(control: AbstractControl): ValidationErrors | null {
  const valor: unknown = control.value;
  if (valor == null || valor === '') return null;
  return typeof valor === 'number' && valor > 0 ? null : { montoPositivo: true };
}
