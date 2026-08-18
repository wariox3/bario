/**
 * Contacto: cubre clientes, proveedores y empleados sobre el mismo recurso.
 * El backend discrimina internamente por los flags `cliente`, `proveedor`, `empleado`.
 *
 * Shape de lectura: los relacionales viajan con el nombre "pelado" (el id del FK,
 * p. ej. `identificacion`, `tipo_persona`, `ciudad`) y, para algunos, un
 * `<campo>_nombre`/`<campo>_abreviatura` acompañante para mostrar. Es el mismo
 * shape que `ContactoPayload` usa en escritura.
 */
export interface Contacto {
  readonly id: number;
  readonly numero_identificacion: string;
  readonly digito_verificacion: string | null;
  readonly nombre_corto: string;
  readonly nombre1: string | null;
  readonly nombre2: string | null;
  readonly apellido1: string | null;
  readonly apellido2: string | null;
  readonly direccion: string | null;
  readonly barrio: string | null;
  readonly codigo_ciuu: string | null;
  readonly codigo_postal: string | null;
  readonly identificacion_abreviatura: string | null;
  readonly telefono: string | null;
  readonly celular: string | null;
  readonly correo: string | null;
  readonly correo_facturacion_electronica: string | null;
  readonly cliente: boolean;
  readonly proveedor: boolean;
  readonly empleado: boolean;
  readonly conductor: boolean;
  readonly numero_cuenta: string | null;
  readonly numero_licencia: string | null;
  readonly fecha_vence_licencia: string | null;
  readonly identificacion: number;
  readonly identificacion_nombre: string;
  readonly ciudad: number;
  readonly ciudad_nombre: string;
  readonly tipo_persona: number;
  readonly tipo_persona_nombre: string;
  readonly asesor: number | null;
  readonly precio: number | null;
  readonly plazo_pago: number | null;
  readonly plazo_pago_proveedor: number | null;
  readonly banco: number | null;
  readonly banco_nombre?: string | null;
  readonly cuenta_banco_clase: number | null;
  readonly responsabilidad: number | null;
  readonly responsabilidad_nombre: string | null;
  /**
   * Nombres de los FK comerciales que el endpoint de detalle (`getById`)
   * acompaña al id. Opcionales: el shape de lista no los trae. Las claves
   * siguen la convención `<campo>_nombre`; verificar contra una respuesta real
   * si alguno llega vacío en la ficha de detalle.
   */
  readonly plazo_pago_nombre?: string | null;
  readonly precio_nombre?: string | null;
  readonly asesor_nombre?: string | null;
  readonly cuenta_banco_clase_nombre?: string | null;
  readonly plazo_pago_proveedor_nombre?: string | null;
  readonly departamento_nombre?: string | null;
  readonly activo?: boolean;
}

/** Payload para crear o actualizar un contacto. */
export interface ContactoPayload {
  readonly tipo_persona: number | null;
  readonly responsabilidad: number | null;
  readonly identificacion: number | null;
  readonly numero_identificacion: string;
  readonly digito_verificacion: string | null;
  readonly nombre_corto: string | null;
  readonly nombre1: string | null;
  readonly nombre2: string | null;
  readonly apellido1: string | null;
  readonly apellido2: string | null;
  readonly telefono: string | null;
  readonly celular: string | null;
  readonly ciudad: number | null;
  readonly direccion: string | null;
  readonly barrio: string | null;
  readonly correo: string | null;
  readonly cliente: boolean;
  readonly proveedor: boolean;
  readonly empleado: boolean;
  readonly plazo_pago: number | null;
  readonly precio: number | null;
  readonly asesor: number | null;
  readonly correo_facturacion_electronica: string | null;
  readonly banco: number | null;
  readonly numero_cuenta: string | null;
  readonly cuenta_banco_clase: number | null;
  readonly plazo_pago_proveedor: number | null;
}

/**
 * Respuesta de la consulta a la DIAN (`consulta-dian/`).
 * `encontrado` indica si la identificación existe en el registro; cuando es
 * `false`, los demás campos vienen `null`. `nit` es un string (eco del número
 * consultado) que no usamos para autocompletar.
 */
export interface ConsultaDianResponse {
  readonly encontrado: boolean;
  readonly nit: string | null;
  readonly nombre: string | null;
  readonly correo: string | null;
}
