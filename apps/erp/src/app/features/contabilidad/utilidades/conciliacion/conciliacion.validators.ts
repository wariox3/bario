import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * El periodo de la conciliación debe estar bien ordenado: `fecha_desde` no puede
 * ser posterior a `fecha_hasta`.
 *
 * Va a nivel de grupo porque compara dos controles. Trabaja sobre los `Date`
 * locales del datepicker; si falta alguno no opina (de eso se encargan los
 * `required` de cada campo).
 */
export function rangoFechasValido(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const desde = group.get('fecha_desde')?.value;
    const hasta = group.get('fecha_hasta')?.value;
    if (!(desde instanceof Date) || !(hasta instanceof Date)) return null;
    if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) return null;

    return desde.getTime() > hasta.getTime() ? { rangoFechasInvalido: true } : null;
  };
}
