import type { ErpSelectOption } from '@reddoc/core';

/**
 * Forma cruda del FormGroup del contacto (lo que devuelve `form.getRawValue()`).
 * Los selects/autocompletes devuelven el `ErpSelectOption` seleccionado;
 * los campos de texto devuelven `string | null`.
 */
export interface ContactoFormRawValue {
  readonly tipo_persona: ErpSelectOption | null;
  readonly responsabilidad: ErpSelectOption | null;
  readonly identificacion: ErpSelectOption | null;
  readonly numero_identificacion: string | null;
  readonly digito_verificacion: string | null;
  readonly nombre_corto: string | null;
  readonly nombre1: string | null;
  readonly nombre2: string | null;
  readonly apellido1: string | null;
  readonly apellido2: string | null;
  readonly telefono: string | null;
  readonly celular: string | null;
  readonly ciudad: ErpSelectOption | null;
  readonly direccion: string | null;
  readonly barrio: string | null;
  readonly correo: string | null;
  readonly cliente: boolean | null;
  readonly proveedor: boolean | null;
  readonly empleado: boolean | null;
  readonly plazo_pago: ErpSelectOption | null;
  readonly precio: ErpSelectOption | null;
  readonly asesor: ErpSelectOption | null;
  readonly correo_facturacion_electronica: string | null;
  readonly banco: ErpSelectOption | null;
  readonly numero_cuenta: string | null;
  readonly cuenta_banco_clase: ErpSelectOption | null;
  readonly plazo_pago_proveedor: ErpSelectOption | null;
}
