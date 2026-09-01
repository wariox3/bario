import { daysBetween } from '@reddoc/core';
import { NOVEDAD_TIPO_REFERENCIA_ID, NOVEDAD_TIPO_VACACIONES_ID } from './novedad.constants';

/**
 * Reglas de dominio del formulario de novedad — funciones puras, sin Angular.
 *
 * Centralizan la lógica condicional que en el legacy estaba dispersa con ids
 * mágicos en el componente. Al ser puras, son fáciles de testear y mueven la
 * decisión "qué muestra el formulario" fuera de la vista.
 */

/** ¿El tipo seleccionado es vacaciones? (habilita periodo + días disfrutados/dinero). */
export function esVacaciones(tipoId: number | null): boolean {
  return tipoId === NOVEDAD_TIPO_VACACIONES_ID;
}

/**
 * ¿Se debe ofrecer el selector de novedad de referencia? Solo para el tipo que la
 * usa y cuando ya hay un contrato elegido (la referencia se filtra por ambos).
 */
export function requiereReferencia(tipoId: number | null, contratoId: number | null): boolean {
  return tipoId === NOVEDAD_TIPO_REFERENCIA_ID && contratoId != null;
}

/**
 * Días que dura la novedad, **contando los dos extremos**: del 24/08 al 31/08 son
 * 8, no 7. Es la cuenta del ERP anterior y la que espera el backend.
 *
 * El backend nuevo **no** lo calcula —`dias` viaja en `HumNovedadRequest`—, a
 * diferencia del anterior, que sí lo hacía. Sin mandarlo, la novedad se guarda en
 * cero días y el total, que sí calcula el backend, sale en cero con ella.
 */
export function diasDeNovedad(desde: Date | null, hasta: Date | null): number | null {
  if (!desde || !hasta) return null;
  const dias = daysBetween(desde, hasta) + 1;
  return dias > 0 ? dias : null;
}

// No hay regla que ate `dias_disfrutados + dias_dinero` a los días de la novedad:
// los días en dinero se pagan sin tomarse (no viven en el rango de fechas) y los
// disfrutados suelen contarse en hábiles, mientras el rango es calendario. El
// backend cuadra el calendario por su cuenta en `dias_disfrutados_reales`.
