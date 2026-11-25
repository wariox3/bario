export type PeriodoPago = 'M' | 'A';

export interface IntegridadRequest {
  readonly suscripcion_id: number;
  readonly suscripcion_tipo_id: number;
  readonly periodo: PeriodoPago;
  readonly contacto_id: number;
  readonly cliente_id: number;
  readonly monto_cents: number;
  readonly moneda: 'COP';
}

export interface IntegridadResponse {
  readonly hash: string;
  readonly referencia: string;
}

export interface WompiCustomerData {
  readonly email: string;
  readonly full_name: string;
  /** Número nacional, sin indicativo: va junto a `phone_number_prefix`. */
  readonly phone_number?: string;
  /** Indicativo con `+` (`+57`). */
  readonly phone_number_prefix?: string;
  readonly legal_id?: string;
  readonly legal_id_type?: string;
}

export interface WompiCheckoutPayload {
  readonly referencia: string;
  readonly monto_cents: number;
  readonly moneda: 'COP';
  readonly hash: string;
  readonly public_key?: string;
  readonly redirect_url: string;
  readonly customer_data?: WompiCustomerData;
}

export type EstadoPago = 'pending' | 'approved' | 'declined' | 'voided' | 'error';

export interface EstadoPagoResponse {
  readonly estado: EstadoPago;
  readonly transaction_id?: string;
  readonly referencia: string;
  readonly suscripcion_id?: number;
  readonly mensaje?: string;
}

export class WompiCheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WompiCheckoutError';
  }
}
