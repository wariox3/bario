import { partirCelular } from '@reddoc/core';
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

// Wompi exige el código corto en `customer-data:legal-id-type` (CC, CE, NIT,
// PP, TI, DNI, RG, OTHER). Si recibe el nombre largo cae al primer item del
// select, por eso mapeamos del nombre que devuelve
// `/contenedor/identificacion/seleccionar/` (catálogo `CtnIdentificacion`) al
// código. Ese seleccionar no trae el `codigo` DIAN; cuando lo traiga conviene
// mapear por él en vez de por el nombre. Los tipos sin equivalente en Wompi
// van como `OTHER`; "Sin identificación del exterior" no se manda.
const LEGAL_ID_TYPE_TO_WOMPI: Readonly<Record<string, string>> = {
  // Claves sin tildes: `claveTipo` normaliza igual el nombre que llega.
  'cedula de ciudadania': 'CC',
  'cedula de extranjeria': 'CE',
  'numero de identificacion tributaria': 'NIT',
  nit: 'NIT',
  pasaporte: 'PP',
  'tarjeta de identidad': 'TI',
  'registro civil de nacimiento': 'OTHER',
  'tarjeta de extranjeria': 'OTHER',
  'tipo de documento extranjero': 'OTHER',
};

export function calcularMontoCents(precio: string, anual: boolean): number {
  const valor = anual ? annualTotal(precio) : displayedMonthly(precio, false);
  return valor * 100;
}

export function armarCustomerData(bp: BillingProfile): WompiCustomerData {
  const legalIdType = mapLegalIdType(bp.tipo);
  const legalId = bp.numero?.trim();
  // Wompi exige el documento y su tipo juntos: uno sin el otro no se precarga.
  const conDocumento = !!legalIdType && !!legalId;
  return {
    email: bp.email,
    full_name: bp.nombre,
    ...partirTelefono(bp.celular),
    legal_id: conDocumento ? legalId : undefined,
    legal_id_type: conDocumento ? legalIdType : undefined,
  };
}

/**
 * Wompi pide el celular en dos campos (`phone-number` nacional y
 * `phone-number-prefix` como `+57`) y uno sin el otro no se precarga. Un
 * indicativo fuera del catálogo no se puede partir con certeza: se omite.
 */
function partirTelefono(
  celular: string | undefined,
): Pick<WompiCustomerData, 'phone_number' | 'phone_number_prefix'> {
  const { pais, nacional, enCatalogo } = partirCelular(celular);
  if (!nacional || !enCatalogo) return {};
  return { phone_number: nacional, phone_number_prefix: `+${pais.indicativo}` };
}

function mapLegalIdType(tipo: string | undefined): string | undefined {
  if (!tipo) return undefined;
  return LEGAL_ID_TYPE_TO_WOMPI[claveTipo(tipo)];
}

function claveTipo(tipo: string): string {
  return tipo
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
