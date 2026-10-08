import type { SoftwareModulo, SoftwareTipo } from './factura-electronica.model';

/**
 * Tipos de software que agrupa cada módulo, en el orden en que se muestran sus
 * tarjetas. Las tarjetas salen de acá y no de la respuesta: un tipo sin
 * software también tiene su tarjeta, con la opción de crearlo.
 */
export const TIPOS_POR_MODULO = {
  facturacion: ['facturacion', 'documento_equivalente'],
  nomina: ['nomina'],
} as const satisfies Record<SoftwareModulo, readonly SoftwareTipo[]>;
