/**
 * Respuesta de `POST humano/credito/validar/`. El proceso recalcula `abono`,
 * `cuota_actual` y `saldo` de todos los créditos desde las nóminas aprobadas y
 * sin anular, **corrige** los que no cuadran y dice cuántos tocó:
 * `{"ejecutado":true,"corregidos":<n>}`.
 *
 * El schema declara la respuesta como objeto libre: `corregidos` puede faltar.
 */
export interface ValidarCreditosResult {
  readonly ejecutado: boolean;
  readonly corregidos?: number;
}
