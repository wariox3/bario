import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Mes de diciembre en la numeración 0-based de `Date`. */
const DICIEMBRE = 11;

/**
 * La fecha del cierre debe ser un **31 de diciembre**: el documento cierra el
 * ejercicio, no un periodo cualquiera.
 *
 * Trabaja sobre el `Date` **local** que entrega el datepicker, así que compara
 * día y mes directo. El ERP anterior parseaba el string `yyyy-MM-dd` con
 * `new Date(...)` —que lo interpreta como UTC— y compensaba sumando 1 al día;
 * ese truco solo acierta en zonas horarias negativas.
 *
 * No valida el año: cerrar un ejercicio anterior es legítimo.
 */
export function fecha31Diciembre(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    // El `required` es quien reporta el vacío; acá no se opina.
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;

    const es31Diciembre = value.getMonth() === DICIEMBRE && value.getDate() === 31;
    return es31Diciembre ? null : { noEs31Diciembre: true };
  };
}
