import { toFiniteNumber, type Item, type ItemPayload } from '@reddoc/core';

/** Valores del formulario de ítem rápido (alta y edición desde la caja). */
export interface ItemRapidoValores {
  readonly codigo: string;
  readonly nombre: string;
  readonly precio: number | null;
  readonly tipo: 'producto' | 'servicio';
  /** Solo aplica a productos: un servicio nunca maneja inventario. */
  readonly inventario: boolean;
  /** Impuestos **de venta**: los de compra no se muestran ni se tocan. */
  readonly impuestos_ids: readonly number[];
  readonly favorito: boolean;
  /** Solo en edición: un ítem nuevo nace activo. */
  readonly inactivo: boolean;
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

/** Ítem del backend → formulario de edición. */
export function itemRapidoDesdeItem(item: Item): ItemRapidoValores {
  return {
    codigo: item.codigo ?? '',
    nombre: item.nombre,
    precio: toFiniteNumber(item.precio) ?? 0,
    tipo: item.servicio ? 'servicio' : 'producto',
    inventario: item.inventario,
    impuestos_ids: (item.impuestos ?? [])
      .filter((i) => i.impuesto_venta === true)
      .map((i) => i.impuesto),
    favorito: item.favorito,
    inactivo: item.inactivo,
  };
}

/**
 * Formulario → `PATCH item/{id}/` con solo lo que la caja edita. Costo, cuentas,
 * referencia y demás quedan como estaban en el ERP.
 *
 * `impuestos_ids` reemplaza la lista entera: se suman los impuestos que no son
 * de venta (los de compra) que el ítem ya tenía, para no borrarlos.
 */
export function itemRapidoToPatch(v: ItemRapidoValores, original: Item): Partial<ItemPayload> {
  const producto = v.tipo === 'producto';
  const ajenos = (original.impuestos ?? [])
    .filter((i) => i.impuesto_venta !== true)
    .map((i) => i.impuesto);
  return {
    codigo: v.codigo.trim(),
    nombre: v.nombre.trim(),
    precio: v.precio ?? 0,
    producto,
    servicio: !producto,
    inventario: producto && v.inventario,
    favorito: v.favorito,
    inactivo: v.inactivo,
    impuestos_ids: [...new Set([...ajenos, ...v.impuestos_ids])],
  };
}
