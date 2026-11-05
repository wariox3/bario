import type { Caja, CajaPayload } from './caja.model';
import type { CajaFormRawValue } from './pages/caja-form/caja-form.types';

/** El form se mapeó sin sede: el `required` debió frenarlo antes de guardar. */
export class CajaSinSedeError extends Error {
  constructor() {
    super('La caja no se puede guardar sin sede.');
    this.name = 'CajaSinSedeError';
  }
}

/** Read-model → form-model. La sede se rehidrata con su `sede_nombre` para el select. */
export function cajaToFormValue(c: Caja): CajaFormRawValue {
  return {
    nombre: c.nombre,
    sede: { id: c.sede, nombre: c.sede_nombre ?? '' },
    placa: c.placa ?? '',
    tipo: c.tipo ?? '',
    ubicacion: c.ubicacion ?? '',
    estado_activo: c.estado_activo,
  };
}

/** Texto opcional: el backend exige `minLength: 1`, así que vacío viaja como `null`. */
function textoOpcional(valor: string): string | null {
  return valor.trim() || null;
}

/** Form-model → write-model. Se llama con el form válido: la sede ya está elegida. */
export function cajaFormToPayload(v: CajaFormRawValue): CajaPayload {
  if (!v.sede) throw new CajaSinSedeError();
  return {
    nombre: v.nombre.trim(),
    sede: v.sede.id,
    placa: textoOpcional(v.placa),
    tipo: textoOpcional(v.tipo),
    ubicacion: textoOpcional(v.ubicacion),
    estado_activo: v.estado_activo,
  };
}
