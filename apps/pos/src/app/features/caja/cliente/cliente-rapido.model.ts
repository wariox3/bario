import type { Ciudad, ErpSelectOption } from '@reddoc/core';

/** Valores del formulario de cliente rápido. */
export interface ClienteRapidoValores {
  readonly tipo_persona: ErpSelectOption | null;
  readonly identificacion: ErpSelectOption | null;
  readonly numero_identificacion: string;
  /** Razón social; solo persona jurídica. */
  readonly nombre_corto: string;
  /** Nombres y apellidos; solo persona natural. */
  readonly nombre1: string;
  readonly nombre2: string;
  readonly apellido1: string;
  readonly apellido2: string;
  readonly correo: string;
  readonly telefono: string;
  readonly direccion: string;
  readonly ciudad: Ciudad | null;
}

/** Cuerpo de `POST general/contacto/` con lo mínimo que exige el backend. */
export interface ClienteRapidoPayload {
  readonly tipo_persona: number | null;
  readonly identificacion: number | null;
  readonly numero_identificacion: string;
  readonly digito_verificacion: string;
  readonly nombre_corto: string;
  readonly nombre1: string | null;
  readonly nombre2: string | null;
  readonly apellido1: string | null;
  readonly apellido2: string | null;
  readonly correo: string;
  readonly telefono: string;
  readonly direccion: string;
  readonly ciudad: number | null;
  readonly cliente: true;
  readonly proveedor: false;
  readonly empleado: false;
}

/** Lo que devuelve el backend al crear: lo justo para dejarlo elegido en la venta. */
export interface ClienteCreado {
  readonly id: number;
  readonly nombre_corto: string;
  readonly numero_identificacion: string;
}
