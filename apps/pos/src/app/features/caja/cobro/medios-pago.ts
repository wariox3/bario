/**
 * Medios de pago de la caja.
 *
 * Cada medio declara **a qué cuentas puede entrar**: el efectivo a las de tipo
 * caja y el resto a las de banco. El método de pago del documento no depende del
 * medio: va fijo (`METODO_PAGO_POS_ID`). Efectivo y
 * transferencia están habilitados; sumar otro es habilitarlo aquí y darle su
 * formulario en el diálogo de cobro.
 *
 * El orden es el de las tarjetas del cobro y el de sus atajos (F1, F2…).
 */
import { CUENTA_BANCO_TIPO_CAJA } from '@reddoc/core';

export type MedioPagoId = 'efectivo' | 'tarjetaCredito' | 'tarjetaDebito' | 'transferencia';

export interface MedioPagoPos {
  readonly id: MedioPagoId;
  readonly icono: string;
  readonly habilitado: boolean;
  /** Si el pago entra a una cuenta de tipo caja (efectivo) o a una de banco. */
  readonly cuenta: 'caja' | 'banco';
}

/** La cuenta bancaria sirve para el medio: caja con caja, cualquier otro tipo con banco. */
export function cuentaAdmiteMedio(cuentaBancoTipo: number | null, medio: MedioPagoPos): boolean {
  const esCaja = cuentaBancoTipo === CUENTA_BANCO_TIPO_CAJA;
  return medio.cuenta === 'caja' ? esCaja : cuentaBancoTipo !== null && !esCaja;
}

export const MEDIOS_PAGO_POS: readonly MedioPagoPos[] = [
  { id: 'efectivo', icono: 'pi pi-money-bill', habilitado: true, cuenta: 'caja' },
  {
    id: 'transferencia',
    icono: 'pi pi-building-columns',
    habilitado: true,
    cuenta: 'banco',
  },
  {
    id: 'tarjetaCredito',
    icono: 'pi pi-credit-card',
    habilitado: false,
    cuenta: 'banco',
  },
  {
    id: 'tarjetaDebito',
    icono: 'pi pi-credit-card',
    habilitado: false,
    cuenta: 'banco',
  },
];
