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
    caja_placa: s.caja_placa ?? '',
    caja_ubicacion: s.caja_ubicacion ?? '',
    caja_tipo: s.caja_tipo ?? '',
    centro_costo:
      s.centro_costo != null ? { id: s.centro_costo, nombre: s.centro_costo_nombre ?? '' } : null,
  };
}

/** Texto opcional: el backend exige `minLength: 1`, así que vacío viaja como `null`. */
function textoOpcional(valor: string | null): string | null {
  const texto = valor?.trim() ?? '';
  return texto || null;
}

/** Form-model → write-model. La FK se envía como id pelado. */
export function formValueToPayload(v: SedeFormRawValue): SedePayload {
  return {
    nombre: v.nombre ?? '',
    caja_placa: textoOpcional(v.caja_placa),
    caja_ubicacion: textoOpcional(v.caja_ubicacion),
    caja_tipo: textoOpcional(v.caja_tipo),
    centro_costo: v.centro_costo?.id ?? null,
  };
}
