import {
  TIPO_PERSONA,
  buildContactoLabel,
  calcularDigitoVerificacion,
  construirNombreCorto,
  type ErpSelectOption,
} from '@reddoc/core';
import type {
  ClienteCreado,
  ClienteRapidoPayload,
  ClienteRapidoValores,
} from './cliente-rapido.model';

function textoONulo(valor: string): string | null {
  const limpio = valor.trim();
  return limpio ? limpio : null;
}

/**
 * Formulario → `POST contacto/`. Una persona natural se guarda con nombres y
 * apellidos, y su nombre corto se arma con ellos (igual que el ERP); una
 * jurídica, con la razón social. Es siempre cliente.
 */
export function clienteRapidoToPayload(v: ClienteRapidoValores): ClienteRapidoPayload {
  const natural = v.tipo_persona?.id === TIPO_PERSONA.NATURAL;
  const numero = v.numero_identificacion.trim();
  const nombres = {
    nombre1: natural ? textoONulo(v.nombre1) : null,
    nombre2: natural ? textoONulo(v.nombre2) : null,
    apellido1: natural ? textoONulo(v.apellido1) : null,
    apellido2: natural ? textoONulo(v.apellido2) : null,
  };
  return {
    tipo_persona: v.tipo_persona?.id ?? null,
    identificacion: v.identificacion?.id ?? null,
    numero_identificacion: numero,
    digito_verificacion: calcularDigitoVerificacion(numero),
    nombre_corto: natural ? construirNombreCorto(nombres) : v.nombre_corto.trim(),
    ...nombres,
    correo: v.correo.trim(),
    telefono: v.telefono.trim(),
    direccion: v.direccion.trim(),
    ciudad: v.ciudad?.id ?? null,
    cliente: true,
    proveedor: false,
    empleado: false,
  };
}

/** Cliente recién creado → opción del selector de la venta (misma etiqueta que el autocomplete). */
export function clienteCreadoToOpcion(creado: ClienteCreado): ErpSelectOption {
  return {
    id: creado.id,
    nombre: buildContactoLabel(creado.numero_identificacion, creado.nombre_corto),
  };
}
