import type { ErpSelectOption } from '@reddoc/core';

/**
 * Forma cruda del FormGroup de cuenta (lo que devuelve `form.getRawValue()`).
 * Las FK de la cascada guardan el `ErpSelectOption` seleccionado.
 */
export interface CuentaFormRawValue {
  readonly codigo: string | null;
  readonly nombre: string | null;
  readonly cuenta_clase: ErpSelectOption | null;
  readonly cuenta_grupo: ErpSelectOption | null;
  readonly cuenta_cuenta: ErpSelectOption | null;
  readonly exige_base: boolean | null;
  readonly exige_contacto: boolean | null;
  readonly exige_centro_costo: boolean | null;
  readonly permite_movimiento: boolean | null;
}
