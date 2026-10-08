import { normalizarCelular } from '@reddoc/core';
import { BillingProfile } from '../models/billing-profile.model';
import { PeriodoPago, WompiCustomerData } from '../models/pago.model';
import { annualTotal, displayedMonthly } from '../pages/planes/utils/plan-pricing';

export const WOMPI_REF_STORAGE_KEY = 'reddoc:wompi:ref';
export const WOMPI_INTENT_STORAGE_KEY = 'reddoc:wompi:intent';

/**
 * Snapshot del intento de pago que el frontend ya conoce ANTES de redirigir a
 * Wompi. La página de resultado lo lee al volver para mostrar plan/monto/billing
 * sin tener que esperar a que el backend amplíe el endpoint de polling. Cuando
 * el endpoint devuelva esos campos, deberían sobrescribir lo del storage.
 */
export interface PagoIntent {
  readonly referencia: string;
  readonly plan_id: number;
  readonly plan_nombre: string;
  readonly plan_categoria_label: string;
  readonly periodo: PeriodoPago;
  readonly monto_cents: number;
  readonly billing_nombre: string;
  readonly billing_tipo: string;
  readonly billing_numero: string;
  readonly billing_email: string;
  readonly started_at: string;
}

export function savePagoIntent(intent: PagoIntent): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(WOMPI_INTENT_STORAGE_KEY, JSON.stringify(intent));
}

export function readPagoIntent(): PagoIntent | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(WOMPI_INTENT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PagoIntent;
  } catch {
    return null;
  }
}

export function clearPagoIntent(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(WOMPI_INTENT_STORAGE_KEY);
}

// Wompi exige el código corto en `customer-data:legal-id-type`. Si recibe el
// nombre largo cae al primer item del select ("Registro civil"), por eso
// mapeamos del nombre que devuelve /api/general/identificacion/ al código.
const LEGAL_ID_TYPE_TO_WOMPI: Record<string, string> = {
  'cédula de ciudadanía': 'CC',
  'cedula de ciudadania': 'CC',
  'cédula de extranjería': 'CE',
  'cedula de extranjeria': 'CE',
  nit: 'NIT',
  pasaporte: 'PP',
  'tarjeta de identidad': 'TI',
  'registro civil': 'RC',
};

export function calcularMontoCents(precio: string, anual: boolean): number {
  const valor = anual ? annualTotal(precio) : displayedMonthly(precio, false);
  return valor * 100;
}

export function armarCustomerData(bp: BillingProfile): WompiCustomerData {
  return {
    email: bp.email,
    full_name: bp.nombre,
    phone_number: normalizarCelular(bp.celular) || undefined,
    legal_id: bp.numero || undefined,
    legal_id_type: mapLegalIdType(bp.tipo),
  };
}

function mapLegalIdType(tipo: string | undefined): string | undefined {
  if (!tipo) return undefined;
  return LEGAL_ID_TYPE_TO_WOMPI[tipo.trim().toLowerCase()];
}
