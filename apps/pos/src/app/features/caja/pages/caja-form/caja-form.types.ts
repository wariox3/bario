import type { ErpSelectOption } from '@reddoc/core';

/** Forma cruda del FormGroup de caja (`form.getRawValue()`). */
export interface CajaFormRawValue {
  readonly nombre: string;
  readonly sede: ErpSelectOption | null;
  readonly placa: string;
  readonly tipo: string;
  readonly ubicacion: string;
  readonly estado_activo: boolean;
}
