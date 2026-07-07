import type { Puesto, PuestoPayload } from './puesto.model';
import type { PuestoFormRawValue } from './pages/puesto-form/puesto-form.types';

export function puestoToFormValue(p: Puesto): Partial<PuestoFormRawValue> {
  return {
    nombre: p.nombre,
    direccion: p.direccion ?? '',
    celular: p.celular ?? '',
    latitud: p.latitud ?? '',
    longitud: p.longitud ?? '',
    comentario: p.comentario ?? '',
    ciudad: p.ciudad != null ? { id: p.ciudad, nombre: p.ciudad_nombre ?? '' } : null,
    contacto: p.contacto != null ? { id: p.contacto, nombre: p.contacto_nombre ?? '' } : null,
    centroCosto:
      p.centro_costo != null ? { id: p.centro_costo, nombre: p.centro_costo_nombre ?? '' } : null,
    programador:
      p.programador != null ? { id: p.programador, nombre: p.programador_nombre ?? '' } : null,
  };
}

export function formValueToPayload(v: PuestoFormRawValue): PuestoPayload {
  return {
    nombre: v.nombre ?? '',
    direccion: v.direccion || null,
    celular: v.celular || null,
    latitud: v.latitud || null,
    longitud: v.longitud || null,
    comentario: v.comentario || null,
    ciudad: v.ciudad?.id ?? null,
    contacto: v.contacto?.id ?? null,
    centro_costo: v.centroCosto?.id ?? null,
    programador: v.programador?.id ?? null,
  };
}
