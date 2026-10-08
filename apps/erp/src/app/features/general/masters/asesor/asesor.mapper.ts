import { normalizarCelular } from '@reddoc/core';
import type { Asesor, AsesorPayload } from './asesor.model';
import type { AsesorFormRawValue } from './pages/asesor-form/asesor-form.types';

export function asesorToFormValue(a: Asesor): Partial<AsesorFormRawValue> {
  // Los celulares guardados antes de `lib-phone-input` son dígitos pelados:
  // normalizados a E.164 el campo no nace inválido al abrir la edición.
  return {
    nombre_corto: a.nombre_corto,
    celular: normalizarCelular(a.celular),
    correo: a.correo,
  };
}

export function formValueToPayload(v: AsesorFormRawValue): AsesorPayload {
  return {
    nombre_corto: v.nombre_corto ?? '',
    celular: v.celular ?? '',
    correo: v.correo ?? '',
  };
}
