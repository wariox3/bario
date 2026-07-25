import type { ErpSelectOption } from '@reddoc/core';
import type { InventarioDetalleFormRawValue } from '@erp/features/documentos/inventario/inventario-documento-detalle.types';

/**
 * Valores crudos del formulario de Entrada de almacén (`form.getRawValue()`).
 *
 * Los selects guardan la opción completa (`{ id, nombre }`); `fecha` es `Date`
 * del datepicker; `comentario` es texto; `detalles` son las líneas de
 * inventario. El mapper los normaliza al payload de la API.
 */
export interface EntradaFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly almacen: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly comentario: string | null;
  readonly detalles: readonly InventarioDetalleFormRawValue[];
}
