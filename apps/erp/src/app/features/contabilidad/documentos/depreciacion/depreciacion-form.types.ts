import type { ErpSelectOption } from '@reddoc/core';

/**
 * Valores crudos del formulario de Depreciación (`form.getRawValue()`).
 *
 * Sin `detalles`: las líneas no viven en el formulario —las genera el backend—,
 * así que el form solo cubre la cabecera. El total tampoco: lo calcula el
 * backend y llega de solo lectura.
 */
export interface DepreciacionFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly centro_costo: ErpSelectOption | null;
  readonly comentario: string | null;
}
