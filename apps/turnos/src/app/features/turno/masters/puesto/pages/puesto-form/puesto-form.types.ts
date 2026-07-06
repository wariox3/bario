import type { ErpSelectOption } from '@reddoc/core';

export interface PuestoFormRawValue {
  nombre: string | null;
  direccion: string | null;
  celular: string | null;
  latitud: string | null;
  longitud: string | null;
  comentario: string | null;
  ciudad: ErpSelectOption | null;
  contacto: ErpSelectOption | null;
  centroCosto: ErpSelectOption | null;
  programador: ErpSelectOption | null;
}
