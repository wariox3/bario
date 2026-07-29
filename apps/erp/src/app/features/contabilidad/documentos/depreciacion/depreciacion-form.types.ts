import type { ErpSelectOption } from '@reddoc/core';

/**
 * Valores crudos del formulario de Depreciación (`form.getRawValue()`).
 *
 * Sin `detalles`: las líneas no viven en el formulario —las genera el backend—,
 * así que el form solo cubre la cabecera. El total viaja aparte, calculado
 * desde las líneas cargadas.
 */
export interface DepreciacionFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly grupo_contabilidad: ErpSelectOption | null;
  readonly comentario: string | null;
}
