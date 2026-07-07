import { TIPO_PERSONA } from '@erp/features/general/masters/contacto/contacto.constants';
import { construirNombreCorto } from '@erp/features/general/masters/contacto/utils/nombre-corto.util';
import { calcularDigitoVerificacion } from '@erp/features/general/masters/contacto/utils/digito-verificacion.util';
import type { Empleado, EmpleadoPayload } from './empleado.model';
import type { EmpleadoFormRawValue } from './pages/empleado-form/empleado-form.types';

/**
 * Valores hardcodeados que el empleado no edita (igual que el legacy, que fijaba
 * `tipo_persona=2` y `regimen=1` ocultos): un empleado siempre es persona natural.
 * `responsabilidad` es el campo que el backend nuevo usa en lugar del antiguo
 * `regimen`; si el id por defecto difiere, ajustar aquí.
 */
const EMPLEADO_TIPO_PERSONA = TIPO_PERSONA.NATURAL;
const EMPLEADO_RESPONSABILIDAD_DEFAULT = 1;

/**
 * Adapta el read-model (`Empleado`/`Contacto`) a los valores del reactive form.
 * Solo los campos que el form de empleado realmente muestra (siempre natural).
 */
export function empleadoToFormValue(c: Empleado): Partial<EmpleadoFormRawValue> {
  return {
    identificacion: { id: c.identificacion, nombre: c.identificacion_nombre },
    numero_identificacion: c.numero_identificacion,
    nombre1: c.nombre1 ?? '',
    nombre2: c.nombre2 ?? '',
    apellido1: c.apellido1 ?? '',
    apellido2: c.apellido2 ?? '',
    telefono: c.telefono ?? '',
    celular: c.celular ?? '',
    ciudad: { id: c.ciudad, nombre: c.ciudad_nombre },
    direccion: c.direccion ?? '',
    barrio: c.barrio ?? '',
    correo: c.correo ?? '',
    banco: c.banco != null ? { id: c.banco, nombre: c.banco_nombre ?? '' } : null,
    numero_cuenta: c.numero_cuenta ?? '',
    cuenta_banco_clase:
      c.cuenta_banco_clase != null ? { id: c.cuenta_banco_clase, nombre: '' } : null,
  };
}

/**
 * Construye el `EmpleadoPayload` (= `ContactoPayload`) desde el form.
 *
 * - Empleado siempre natural: `tipo_persona`/`responsabilidad` van con los valores
 *   por defecto; el `nombre_corto` se arma desde nombres/apellidos; el dígito de
 *   verificación se deriva del número.
 * - Fuerza `empleado: true`, `cliente: false`, `proveedor: false`.
 * - Los campos comerciales (plazo de pago, precio, asesor, correo de facturación,
 *   plazo de pago proveedor) van `null`: no aplican a un empleado.
 * - Strings vacíos se normalizan a `null`.
 */
export function formValueToPayload(v: EmpleadoFormRawValue): EmpleadoPayload {
  const numero = v.numero_identificacion ?? '';
  return {
    tipo_persona: EMPLEADO_TIPO_PERSONA,
    responsabilidad: EMPLEADO_RESPONSABILIDAD_DEFAULT,
    identificacion: v.identificacion?.id ?? null,
    numero_identificacion: numero,
    digito_verificacion: calcularDigitoVerificacion(numero) || null,
    nombre_corto:
      construirNombreCorto({
        nombre1: v.nombre1,
        nombre2: v.nombre2,
        apellido1: v.apellido1,
        apellido2: v.apellido2,
      }) || null,
    nombre1: v.nombre1 || null,
    nombre2: v.nombre2 || null,
    apellido1: v.apellido1 || null,
    apellido2: v.apellido2 || null,
    telefono: v.telefono || null,
    celular: v.celular || null,
    ciudad: v.ciudad?.id ?? null,
    direccion: v.direccion || null,
    barrio: v.barrio || null,
    correo: v.correo || null,
    cliente: false,
    proveedor: false,
    empleado: true,
    plazo_pago: null,
    precio: null,
    asesor: null,
    correo_facturacion_electronica: null,
    banco: v.banco?.id ?? null,
    numero_cuenta: v.numero_cuenta || null,
    cuenta_banco_clase: v.cuenta_banco_clase?.id ?? null,
    plazo_pago_proveedor: null,
  };
}
