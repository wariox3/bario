/**
 * Medios de pago de la caja.
 *
 * Cada medio declara su **código DIAN** de método de pago (el catálogo
 * `metodo-pago/seleccionar/` lo trae como `codigo`): el cobro resuelve el id del
 * tenant a partir de él, sin ids fijos. Por ahora solo efectivo está habilitado;
 * sumar otro es habilitarlo aquí, darle su formulario en el diálogo de cobro y
 * su cuenta bancaria en la configuración.
 */
export type MedioPagoId = 'efectivo' | 'tarjetaCredito' | 'tarjetaDebito' | 'transferencia';

export interface MedioPagoPos {
  readonly id: MedioPagoId;
  readonly icono: string;
  /** Código DIAN del medio de pago (tabla 3.4.2 del anexo técnico). */
  readonly codigoDian: string;
  readonly habilitado: boolean;
}

export const MEDIOS_PAGO_POS: readonly MedioPagoPos[] = [
  { id: 'efectivo', icono: 'pi pi-money-bill', codigoDian: '10', habilitado: true },
  { id: 'tarjetaCredito', icono: 'pi pi-credit-card', codigoDian: '48', habilitado: false },
  { id: 'tarjetaDebito', icono: 'pi pi-credit-card', codigoDian: '49', habilitado: false },
  { id: 'transferencia', icono: 'pi pi-building-columns', codigoDian: '47', habilitado: false },
];
