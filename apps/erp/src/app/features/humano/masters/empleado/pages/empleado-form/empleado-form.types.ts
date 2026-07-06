import type { ErpSelectOption } from '@reddoc/core';

/**
 * Forma cruda del FormGroup del empleado (lo que devuelve `form.getRawValue()`).
 *
 * Fiel al legacy: el empleado siempre es **persona natural**, así que el form solo
 * pide identidad (nombres/apellidos), contacto, ubicación y datos bancarios. No
 * incluye tipo de persona ni responsabilidad (van hardcodeados en el mapper), ni
 * el dígito de verificación (se deriva del número en el mapper).
 */
export interface EmpleadoFormRawValue {
  readonly identificacion: ErpSelectOption | null;
  readonly numero_identificacion: string | null;
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
  readonly banco: ErpSelectOption | null;
  readonly numero_cuenta: string | null;
  readonly cuenta_banco_clase: ErpSelectOption | null;
}
