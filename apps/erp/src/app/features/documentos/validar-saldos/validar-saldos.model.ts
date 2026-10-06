import type { CarteraTipo } from '@erp/core/module-config';

/** Cuerpo del proceso: qué cartera revisar. */
export interface ValidarSaldosPayload {
  readonly tipo: CarteraTipo;
}

/**
 * Respuesta de `POST general/documento/cartera-validar/`. El proceso recalcula
 * `pago`, `afectado` y `pendiente` de los documentos de la cartera indicada y
 * **corrige** los que no cuadran; solo confirma si corrió: `{"ejecutado":true}`.
 */
export interface ValidarSaldosResult {
  readonly ejecutado: boolean;
}
