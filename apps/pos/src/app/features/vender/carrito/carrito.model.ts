import type { ComercialDetalleFormRawValue, ErpSelectOption, ItemOption } from '@reddoc/core';

/**
 * Una línea del carrito. Es la línea comercial de `@reddoc/core` (la misma que
 * usa el ERP, así el cobro la convierte al payload con `comercialDetalleToPayload`)
 * más lo que la caja necesita para pintarla y cuidar el stock.
 */
export interface LineaCarrito extends ComercialDetalleFormRawValue {
  readonly item: ItemOption;
  readonly cantidad: number;
  readonly precio: number;
  readonly codigo: string;
  readonly imagenUrl: string | null;
  /** Tope de unidades por stock, o `null` si el ítem no lo controla. */
  readonly disponible: number | null;
  /** Precio de venta propio del ítem, sin lista de precios. */
  readonly precioBase: number;
  /**
   * La persona cambió el precio a mano. Cambiar de cliente recotiza las líneas
   * contra su lista de precios, pero respeta las que se editaron.
   */
  readonly precioEditado: boolean;
}

/**
 * Cobro empezado que no terminó: el documento ya existe en el backend pero
 * falló registrar el pago o aprobarlo. Mientras exista, la venta no se edita y
 * cobrar retoma desde aquí, para no crear una segunda factura.
 */
export interface CobroPendiente {
  readonly documentoId: number;
  /** El pago ya quedó registrado: falta solo aprobar. */
  readonly pagado: boolean;
}

/** Una venta abierta (una pestaña). */
export interface Carrito {
  readonly uuid: string;
  readonly nombre: string;
  /** Opción del contacto; conserva `precio_id` para cotizar contra su lista. */
  readonly contacto: ErpSelectOption | null;
  readonly lineas: readonly LineaCarrito[];
  /** Ausente mientras no se haya intentado cobrar. */
  readonly cobro?: CobroPendiente;
}

/** Versión del esquema persistido: si cambia la forma, lo guardado se descarta. */
export const VERSION_CARRITOS = 1;

/** Todo lo que la caja recuerda de sus ventas abiertas en un tenant. */
export interface EstadoCarritos {
  readonly version: typeof VERSION_CARRITOS;
  readonly carritos: readonly Carrito[];
  readonly activoId: string;
}
