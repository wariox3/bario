import { Injectable, inject } from '@angular/core';
import { ENVIRONMENT } from '@reddoc/core';
import { WompiCheckoutError, WompiCheckoutPayload } from '../models/pago.model';

const WOMPI_CHECKOUT_BASE = 'https://checkout.wompi.co/p/';

interface OpenCheckoutInput {
  readonly intencion: WompiCheckoutPayload;
}

@Injectable({ providedIn: 'root' })
export class WompiCheckoutService {
  private readonly environment = inject(ENVIRONMENT);

  /**
   * Construye la URL del Web Checkout sin redirigir. Útil para tests y para
   * inspeccionarla antes de mandar al usuario. El método de pago lo elige el
   * usuario en la propia pantalla de Wompi (tarjeta, PSE, Nequi, etc.), por
   * eso no pasamos `payment-method-type`.
   */
  buildCheckoutUrl(input: OpenCheckoutInput): string {
    const publicKey = input.intencion.public_key?.trim() || this.environment.wompiPublicKey?.trim();
    if (!publicKey) {
      throw new WompiCheckoutError('Wompi no está configurado: falta wompiPublicKey.');
    }
    if (!input.intencion.hash) {
      throw new WompiCheckoutError('Falta la firma de integridad del pago.');
    }
    if (!input.intencion.referencia) {
      throw new WompiCheckoutError('Falta la referencia del pago.');
    }
    if (!Number.isFinite(input.intencion.monto_cents) || input.intencion.monto_cents <= 0) {
      throw new WompiCheckoutError('Monto inválido para iniciar el pago.');
    }

    const params = new URLSearchParams();
    params.set('public-key', publicKey);
    params.set('currency', input.intencion.moneda);
    params.set('amount-in-cents', String(input.intencion.monto_cents));
    params.set('reference', input.intencion.referencia);
    params.set('signature:integrity', input.intencion.hash);
    params.set('redirect-url', input.intencion.redirect_url);

    const customer = input.intencion.customer_data;
    if (customer?.email) params.set('customer-data:email', customer.email);
    if (customer?.full_name) params.set('customer-data:full-name', customer.full_name);
    if (customer?.phone_number && customer.phone_number_prefix) {
      params.set('customer-data:phone-number', customer.phone_number);
      params.set('customer-data:phone-number-prefix', customer.phone_number_prefix);
    }
    if (customer?.legal_id && customer.legal_id_type) {
      // Sin `collect-customer-legal-id` Wompi no muestra el campo de documento
      // en "Ingresa tus datos", y entonces no hay dónde precargarlo.
      params.set('collect-customer-legal-id', 'true');
      params.set('customer-data:legal-id', customer.legal_id);
      params.set('customer-data:legal-id-type', customer.legal_id_type);
    }

    return `${WOMPI_CHECKOUT_BASE}?${params.toString()}`;
  }

  /**
   * Construye la URL y redirige el navegador. Mismo tab — Wompi devuelve por
   * `redirect-url` con `?id=<transactionId>`.
   */
  redirectToCheckout(input: OpenCheckoutInput): void {
    const url = this.buildCheckoutUrl(input);
    window.location.assign(url);
  }
}
