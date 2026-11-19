const TELEFONO = '+57 333 259 0638';

/** Datos de contacto de la landing: única fuente del teléfono y su WhatsApp. */
export const CONTACTO = {
  telefono: TELEFONO,
  whatsappUrl: `https://wa.me/${TELEFONO.replace(/\D/g, '')}`,
} as const;
