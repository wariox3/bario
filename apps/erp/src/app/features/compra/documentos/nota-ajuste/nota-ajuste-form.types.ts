import type { ErpSelectOption, ComercialDetalleFormRawValue } from '@reddoc/core';

/**
 * Valores crudos del formulario de Nota ajuste (`form.getRawValue()`).
 *
 * Los selects guardan la opción completa (`{ id, nombre }`); `fecha` es `Date`
 * del datepicker (el vencimiento es la misma: lo arma el mapper);
 * `orden_compra`/`comentario` son texto; `detalles` son las líneas comerciales.
 * El mapper los normaliza al payload de la API.
 */
export interface NotaAjusteFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  /** Documento soporte que la nota ajusta. */
  readonly documento_referencia: ErpSelectOption | null;
  readonly plazo_pago: ErpSelectOption | null;
  readonly metodo_pago: ErpSelectOption | null;
  /** Motivo DIAN de la nota. */
  readonly documento_concepto_correccion: ErpSelectOption | null;
  readonly centro_costo: ErpSelectOption | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
  readonly detalles: readonly ComercialDetalleFormRawValue[];
}
