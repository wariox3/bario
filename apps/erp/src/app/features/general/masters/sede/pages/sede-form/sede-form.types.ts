import type { ErpSelectOption } from '@reddoc/core';

/**
 * Forma cruda del FormGroup de sede (lo que devuelve `form.getRawValue()`).
 * La FK `centro_costo` guarda el `ErpSelectOption` seleccionado.
 */
export interface SedeFormRawValue {
  readonly nombre: string | null;
  readonly centro_costo: ErpSelectOption | null;
}
