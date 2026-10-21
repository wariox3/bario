import {
  buildContactoLabel,
  construirNombreCorto,
  normalizarCelular,
  TIPO_PERSONA,
  type ErpSelectOption,
} from '@reddoc/core';
import type { Contacto, ContactoPayload } from './contacto.model';
import type { ContactoFormRawValue } from './pages/contacto-form/contacto-form.types';

/**
 * Adapta el read-model (`Contacto`) a los valores que espera el reactive form.
 *
 * Los selects/autocompletes guardan `ErpSelectOption` ({ id, nombre }), por lo
 * que el id pelado del FK + su `*_nombre` se reagrupan en objetos. Para los
 * `lib-api-select` el `nombre` puede ir vacío: el select resuelve la etiqueta
 * contra sus opciones por `id`. Para los autocompletes (ciudad, banco) el
 * `nombre` sí importa porque la etiqueta sale del valor — y la ciudad además
 * lleva su `departamento_nombre`, del que sale la etiqueta que ve el usuario.
 */
export function contactoToFormValue(c: Contacto): Partial<ContactoFormRawValue> {
  return {
    tipo_persona: { id: c.tipo_persona, nombre: c.tipo_persona_nombre },
    responsabilidad:
      c.responsabilidad != null
        ? { id: c.responsabilidad, nombre: c.responsabilidad_nombre ?? '' }
        : null,
    identificacion: { id: c.identificacion, nombre: c.identificacion_nombre },
    numero_identificacion: c.numero_identificacion,
    nombre_corto: c.nombre_corto,
    nombre1: c.nombre1 ?? '',
    nombre2: c.nombre2 ?? '',
    apellido1: c.apellido1 ?? '',
    apellido2: c.apellido2 ?? '',
    telefono: c.telefono ?? '',
    // Los celulares guardados antes de `lib-phone-input` son dígitos pelados:
    // normalizados a E.164 el campo no nace inválido al abrir la edición.
    celular: normalizarCelular(c.celular),
    // El departamento viaja con la ciudad para que el campo muestre lo mismo al
    // reabrir que al elegir (`Albania — La Guajira`); sin él, un municipio
    // homónimo se vuelve indistinguible al editar.
    ciudad: {
      id: c.ciudad,
      nombre: c.ciudad_nombre,
      departamento_nombre: c.departamento_nombre ?? null,
    },
    direccion: c.direccion ?? '',
    barrio: c.barrio ?? '',
    correo: c.correo ?? '',
    cliente: c.cliente,
    proveedor: c.proveedor,
    empleado: c.empleado,
    estado_inactivo: c.estado_inactivo,
    plazo_pago: c.plazo_pago != null ? { id: c.plazo_pago, nombre: '' } : null,
    precio: c.precio != null ? { id: c.precio, nombre: '' } : null,
    asesor: c.asesor != null ? { id: c.asesor, nombre: c.asesor_nombre_corto ?? '' } : null,
    correo_facturacion_electronica: c.correo_facturacion_electronica ?? '',
    banco: c.banco != null ? { id: c.banco, nombre: c.banco_nombre ?? '' } : null,
    numero_cuenta: c.numero_cuenta ?? '',
    cuenta_banco_clase:
      c.cuenta_banco_clase != null ? { id: c.cuenta_banco_clase, nombre: '' } : null,
    plazo_pago_proveedor:
      c.plazo_pago_proveedor != null ? { id: c.plazo_pago_proveedor, nombre: '' } : null,
  };
}

/**
 * Construye el write-model (`ContactoPayload`) a partir del valor crudo del form.
 *
 * Reglas:
 * - Si es persona natural, el `nombre_corto` se construye desde nombres/apellidos
 *   (en jurídica el usuario lo ingresa directo).
 * - Los strings vacíos se normalizan a `null` para no enviar campos vacíos al
 *   backend.
 * - Los selects exponen sólo su `id` (o `null` si no hay selección).
 */
export function formValueToPayload(v: ContactoFormRawValue): ContactoPayload {
  const esNatural = v.tipo_persona?.id === TIPO_PERSONA.NATURAL;
  const nombreCorto = esNatural
    ? construirNombreCorto({
        nombre1: v.nombre1,
        nombre2: v.nombre2,
        apellido1: v.apellido1,
        apellido2: v.apellido2,
      })
    : (v.nombre_corto ?? '');

  return {
    tipo_persona: v.tipo_persona?.id ?? null,
    responsabilidad: v.responsabilidad?.id ?? null,
    identificacion: v.identificacion?.id ?? null,
    numero_identificacion: v.numero_identificacion ?? '',
    digito_verificacion: v.digito_verificacion || null,
    nombre_corto: nombreCorto || null,
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
    cliente: v.cliente ?? false,
    proveedor: v.proveedor ?? false,
    empleado: v.empleado ?? false,
    estado_inactivo: v.estado_inactivo ?? false,
    plazo_pago: v.plazo_pago?.id ?? null,
    precio: v.precio?.id ?? null,
    asesor: v.asesor?.id ?? null,
    correo_facturacion_electronica: v.correo_facturacion_electronica || null,
    banco: v.banco?.id ?? null,
    numero_cuenta: v.numero_cuenta || null,
    cuenta_banco_clase: v.cuenta_banco_clase?.id ?? null,
    plazo_pago_proveedor: v.plazo_pago_proveedor?.id ?? null,
  };
}

/**
 * Contacto recién creado (respuesta del `POST`) → la opción que entrega
 * `lib-contacto-select` al elegir uno de `contacto/seleccionar/`.
 *
 * Los documentos leen de esa opción más que la etiqueta: el plazo pactado en
 * cada sentido (`plazo_pago_id`, `plazo_pago_proveedor_id`, ver
 * `plazo-pago-contacto.ts`) y la lista de precios (`precio_id`, ver
 * `precioListaDeContacto`). El `POST` los devuelve con el nombre del FK
 * pelado, así que se traducen a las claves del `seleccionar`: un tercero creado
 * desde el documento autocompleta lo mismo que uno elegido de la lista.
 */
export function contactoToSeleccionarOption(c: Contacto): ErpSelectOption {
  return {
    id: c.id,
    nombre: buildContactoLabel(c.numero_identificacion, c.nombre_corto),
    numero_identificacion: c.numero_identificacion,
    nombre_corto: c.nombre_corto,
    plazo_pago_id: c.plazo_pago,
    plazo_pago_proveedor_id: c.plazo_pago_proveedor,
    precio_id: c.precio,
  };
}
