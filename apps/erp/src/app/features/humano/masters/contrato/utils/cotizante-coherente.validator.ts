import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type { ErpSelectOption } from '@reddoc/core';
import { CONTRATO_TIPO_APRENDIZ_SENA_ID, esTipoCotizanteAprendiz } from '../contrato.constants';

/**
 * Coherencia entre el tipo de contrato y el tipo de cotizante.
 *
 * Los tipos de cotizante de aprendiz del SENA (códigos PILA `12` etapa lectiva y
 * `19` etapa productiva) solo corresponden al vínculo laboral "Aprendíz del
 * Sena"; cualquier otro vínculo cotiza como "Dependiente" (código `01`). El
 * formulario ya corrige la selección al cambiar el tipo de contrato, pero nada
 * impide que el usuario elija después un cotizante que no corresponde: este
 * validador cierra ese hueco y bloquea el guardado en los dos sentidos.
 *
 * Va sobre el control `tipo_cotizante` —no sobre el grupo— para que el
 * `<lib-field-error>` del campo pinte el mensaje sin tratamiento especial. Lee
 * su hermano `contrato_tipo` vía `parent`, así que el formulario debe
 * revalidarlo cuando ese hermano cambia.
 */
export const cotizanteCoherenteValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const cotizante = control.value as ErpSelectOption | null;
  const contratoTipo = control.parent?.get('contrato_tipo')?.value as ErpSelectOption | null;
  if (!cotizante || !contratoTipo) return null;

  const esContratoAprendiz = contratoTipo.id === CONTRATO_TIPO_APRENDIZ_SENA_ID;
  const esCotizanteAprendiz = esTipoCotizanteAprendiz(cotizante.id);

  if (esContratoAprendiz && !esCotizanteAprendiz) return { cotizanteAprendizRequerido: true };
  if (!esContratoAprendiz && esCotizanteAprendiz) return { cotizanteAprendizNoAplica: true };
  return null;
};
