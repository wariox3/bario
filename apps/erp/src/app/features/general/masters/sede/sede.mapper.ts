import type { Sede, SedePayload } from './sede.model';
import type { SedeFormRawValue } from './pages/sede-form/sede-form.types';

/**
 * Read-model → form-model. La FK `centro_costo` se rehidrata como
 * `ErpSelectOption` (`{ id, nombre }`) usando el companion `centro_costo_nombre`
 * para que el autocomplete pinte la etiqueta en modo edición.
 */
export function sedeToFormValue(s: Sede): Partial<SedeFormRawValue> {
  return {
    nombre: s.nombre,
    centro_costo:
      s.centro_costo != null ? { id: s.centro_costo, nombre: s.centro_costo_nombre ?? '' } : null,
  };
}

/** Form-model → write-model. La FK se envía como id pelado. */
export function formValueToPayload(v: SedeFormRawValue): SedePayload {
  return {
    nombre: v.nombre ?? '',
    centro_costo: v.centro_costo?.id ?? null,
  };
}
