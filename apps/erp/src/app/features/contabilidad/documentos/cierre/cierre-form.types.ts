import type { ErpSelectOption } from '@reddoc/core';

/**
 * Valores crudos del formulario de Cierre (`form.getRawValue()`).
 *
 * Sin `detalles`: las líneas no viven en el formulario, las genera el backend.
 */
export interface CierreFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly grupo_contabilidad: ErpSelectOption | null;
  readonly comentario: string | null;
}
