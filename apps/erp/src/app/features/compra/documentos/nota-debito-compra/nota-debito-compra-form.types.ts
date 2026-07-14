import type { ErpSelectOption } from '@reddoc/core';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';

/**
 * Valores crudos del formulario de Nota débito de compra (`form.getRawValue()`).
 *
 * Los selects guardan la opción completa (`{ id, nombre }`); `documento_referencia`
 * es la opción del documento referenciado; `fecha` es `Date` del datepicker;
 * `comentario` es texto; `detalles` son las líneas comerciales. El mapper los
 * normaliza al payload de la API.
 */
export interface NotaDebitoCompraFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly documento_referencia: ErpSelectOption | null;
  readonly centro_costo: ErpSelectOption | null;
  readonly comentario: string | null;
  readonly detalles: readonly ComercialDetalleFormRawValue[];
}
