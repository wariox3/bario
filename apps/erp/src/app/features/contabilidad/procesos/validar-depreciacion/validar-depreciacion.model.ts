/**
 * Respuesta de `POST general/documento/depreciacion-validar/`. El proceso recalcula
 * `depreciacion_acumulada` y `depreciacion_saldo` de todos los activos y **corrige**
 * los que no cuadran; solo confirma si corrió: `{"ejecutado":true}`.
 */
export interface ValidarDepreciacionResult {
  readonly ejecutado: boolean;
}
