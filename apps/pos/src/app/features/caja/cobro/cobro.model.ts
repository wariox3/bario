import type { ErpSelectOption } from '@reddoc/core';
import type { Carrito } from '../carrito/carrito.model';
import type { PosDocumentoTipoId } from '../../configuracion/configuracion-caja.model';
import type { MedioPagoPos } from './medios-pago';

/** Un pago del cobro: cuánto entra y a qué cuenta. */
export interface PagoCobro {
  readonly cuentaBanco: ErpSelectOption;
  readonly monto: number;
}

/** Todo lo que el cobro necesita, ya validado por el diálogo. */
export interface SolicitudCobro {
  readonly venta: Carrito;
  readonly documentoTipoId: PosDocumentoTipoId;
  readonly medio: MedioPagoPos;
  readonly pagos: readonly PagoCobro[];
  readonly almacen: ErpSelectOption;
  readonly sede: ErpSelectOption | null;
  readonly asesor: ErpSelectOption | null;
  readonly soporte: string | null;
  /** Lo que escribió quien cobra, más la referencia de una transferencia. */
  readonly comentario: string | null;
}

/** Paso del cobro en curso, para el estado del botón y los mensajes. */
export type FaseCobro = 'preparando' | 'guardando' | 'pagando' | 'aprobando';

export type EventoCobro =
  | { readonly tipo: 'fase'; readonly fase: FaseCobro }
  | { readonly tipo: 'listo'; readonly documentoId: number };

/**
 * Falla de un paso del cobro. Lleva la fase y, si el documento ya se creó, su
 * id: con eso la venta queda marcada para retomar en vez de duplicar la factura.
 */
export class CobroError extends Error {
  constructor(
    readonly fase: FaseCobro,
    readonly documentoId: number | null,
    readonly pagado: boolean,
    readonly causa: unknown,
  ) {
    super(`El cobro falló en la fase ${fase}`);
    this.name = 'CobroError';
  }
}

/** El tenant no tiene el método de pago o el plazo de contado que el cobro necesita. */
export class CatalogoCobroError extends Error {
  constructor(readonly falta: 'metodoPago' | 'plazoContado') {
    super(`Falta en el catálogo del tenant: ${falta}`);
    this.name = 'CatalogoCobroError';
  }
}
