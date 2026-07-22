import type { ErpSelectOption } from '@reddoc/core';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';

/**
 * Valores crudos del formulario de Pedido de cliente (`form.getRawValue()`).
 *
 * Cabecera mínima (fiel al legacy): el cliente guarda la opción completa
 * (`{ id, nombre }`); `fecha` es un `Date` del datepicker; `detalles` son las
 * líneas comerciales. El mapper los normaliza al payload de la API.
 */
export interface PedidoClienteFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly detalles: readonly ComercialDetalleFormRawValue[];
}
