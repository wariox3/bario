import type { ItemPayload } from '@reddoc/core';

/** Valores del formulario de ítem rápido. */
export interface ItemRapidoValores {
  readonly codigo: string;
  readonly nombre: string;
  readonly precio: number | null;
  readonly tipo: 'producto' | 'servicio';
  /** Solo aplica a productos: un servicio nunca maneja inventario. */
  readonly inventario: boolean;
  readonly impuestos_ids: readonly number[];
  readonly favorito: boolean;
}

/**
 * Formulario → `POST item/`. Un ítem creado desde la caja es de venta, activo,
 * sin costo ni cuentas contables (eso se completa en el ERP). Un servicio no
 * maneja inventario aunque el formulario lo traiga marcado.
 */
export function itemRapidoToPayload(v: ItemRapidoValores): ItemPayload {
  const producto = v.tipo === 'producto';
  return {
    codigo: v.codigo.trim(),
    nombre: v.nombre.trim(),
    referencia: null,
    precio: v.precio ?? 0,
    costo: 0,
    producto,
    servicio: !producto,
    inventario: producto && v.inventario,
    negativo: false,
    venta: true,
    favorito: v.favorito,
    inactivo: false,
    cuenta_venta: null,
    cuenta_compra: null,
    cuenta_costo_venta: null,
    cuenta_inventario: null,
    impuestos_ids: v.impuestos_ids,
  };
}
