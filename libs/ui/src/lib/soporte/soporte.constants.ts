/**
 * Canales de soporte que ofrece `<lib-soporte>`: única fuente para todas las
 * apps. Cambiar un dato acá lo cambia en el header de las cuatro SPAs.
 */
export const SOPORTE_CONTACTO = {
  correo: 'asesor@reddoc.co',
  /** Número de WhatsApp, con indicativo. El enlace `wa.me` usa solo sus dígitos. */
  whatsapp: '+57 333 259 0638',
} as const;
