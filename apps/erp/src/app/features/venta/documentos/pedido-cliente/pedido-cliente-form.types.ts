import type { ErpSelectOption, ComercialDetalleFormRawValue } from '@reddoc/core';

/**
 * Valores crudos del formulario de Pedido de cliente (`form.getRawValue()`).
 *
 * Cabecera mínima: el cliente y la sede guardan la opción completa
 * (`{ id, nombre }`); `fecha` es un `Date` del datepicker; `detalles` son las
 * líneas comerciales. El mapper los normaliza al payload de la API.
 */
export interface PedidoClienteFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly sede: ErpSelectOption | null;
  readonly detalles: readonly ComercialDetalleFormRawValue[];
}
