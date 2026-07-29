import type { ErpSelectOption } from '@reddoc/core';

/**
 * Valores crudos del formulario de conciliación (`form.getRawValue()`).
 *
 * Es toda la cabecera: el periodo y la cuenta bancaria. Las dos colecciones
 * hijas no viven en el formulario — las genera y las cruza el backend.
 */
export interface ConciliacionFormRawValue {
  readonly fecha_desde: Date | null;
  readonly fecha_hasta: Date | null;
  readonly cuenta_banco: ErpSelectOption | null;
}
