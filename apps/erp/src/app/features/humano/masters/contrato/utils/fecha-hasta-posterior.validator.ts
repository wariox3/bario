import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { toIsoDate } from '@reddoc/core';

/**
 * La fecha de fin del contrato no puede quedar antes de la de inicio.
 *
 * El backend lo rechaza al guardar; sin esto el error llegaba recién ahí, lejos
 * del campo. Se compara por día (`yyyy-mm-dd`), que es lo que viaja al backend:
 * un mismo día con distinta hora no es "anterior".
 *
 * Va sobre el control `fecha_hasta` —no sobre el grupo— para que el
 * `<lib-field-error>` del campo pinte el mensaje sin tratamiento especial. Lee
 * su hermano `fecha_desde` vía `parent`, así que el formulario debe revalidarlo
 * cuando ese hermano cambia.
 */
export const fechaHastaPosteriorValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const hasta = control.value as Date | null;
  const desde = control.parent?.get('fecha_desde')?.value as Date | null | undefined;
  if (!hasta || !desde) return null;
  return toIsoDate(hasta) < toIsoDate(desde) ? { fechaHastaAnterior: true } : null;
};
