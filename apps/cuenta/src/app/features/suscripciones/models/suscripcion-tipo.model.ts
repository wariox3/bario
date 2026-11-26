export interface SuscripcionTipo {
  readonly id: number;
  readonly nombre: string;
  readonly precio: string;
  readonly suscripcion_clase_id: number;
  readonly suscripcion_categoria_id: number;
}

export const SUSCRIPCION_CATEGORIA_FACTURACION = 1;
export const SUSCRIPCION_CATEGORIA_ERP = 2;

/** `suscripcion_clase_id` del tipo de suscripción (catálogo `06_suscripcion_tipo`). */
export const SUSCRIPCION_CLASE = {
  /** Planes de Facturación y ERP que se eligen del catálogo. */
  COMERCIAL: 1,
  /** Plan acordado con el cliente: cobra el `precio` de la suscripción. */
  PERSONALIZADO: 2,
  /** Plan de contador: cobra el precio de lista del tipo. */
  CONTADOR: 3,
} as const;
