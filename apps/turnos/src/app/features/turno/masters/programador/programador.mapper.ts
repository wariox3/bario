import type { Programador, ProgramadorPayload } from './programador.model';
import type { ProgramadorFormRawValue } from './pages/programador-form/programador-form.types';

export function programadorToFormValue(p: Programador): Partial<ProgramadorFormRawValue> {
  return { nombre: p.nombre };
}

export function formValueToPayload(v: ProgramadorFormRawValue): ProgramadorPayload {
  return { nombre: v.nombre ?? '' };
}
