import type { ErpSelectOption } from '@reddoc/core';
import type { Item, ItemImpuesto, ItemPayload } from './item.model';
import type { ItemFormRawValue } from './pages/item-form/item-form.types';

/** Reagrupa el id del FK de cuenta + su `*_nombre`/`*_codigo` en un `ErpSelectOption`. */
function cuentaOption(
  id: number | null,
  codigo?: string | null,
  nombre?: string | null,
): ErpSelectOption | null {
  if (id == null) return null;
  // El display prioriza "código - nombre" cuando ambos vienen; cae a lo disponible.
  const label = [codigo, nombre].filter(Boolean).join(' - ');
  return { id, nombre: label || (nombre ?? '') };
}

/** Convierte los impuestos relacionados (filtrados por tipo) en opciones del multiselect. */
function impuestoOptions(
  impuestos: readonly ItemImpuesto[] | undefined,
  tipo: 'venta' | 'compra',
): ErpSelectOption[] {
  if (!impuestos) return [];
  return impuestos
    .filter((i) => (tipo === 'venta' ? i.impuesto_venta : i.impuesto_compra))
    .map((i) => ({ id: i.impuesto, nombre: i.impuesto_nombre ?? '' }));
}

/**
 * Adapta el read-model (`Item`) a los valores que espera el reactive form.
 *
 * Las cuentas se reagrupan en `ErpSelectOption`; los impuestos se separan en sus
 * listas de venta y compra; `producto`/`servicio` se colapsan en el control `tipo`.
 */
export function itemToFormValue(item: Item): Partial<ItemFormRawValue> {
  return {
    codigo: item.codigo,
    nombre: item.nombre,
    referencia: item.referencia ?? '',
    tipo: item.servicio ? 'servicio' : 'producto',
    precio: item.precio,
    costo: item.costo,
    inventario: item.inventario,
    negativo: item.negativo,
    venta: item.venta,
    favorito: item.favorito,
    inactivo: item.inactivo,
    impuestos_venta: impuestoOptions(item.impuestos, 'venta'),
    impuestos_compra: impuestoOptions(item.impuestos, 'compra'),
    cuenta_venta: cuentaOption(
      item.cuenta_venta,
      item.cuenta_venta_codigo,
      item.cuenta_venta_nombre,
    ),
    cuenta_compra: cuentaOption(
      item.cuenta_compra,
      item.cuenta_compra_codigo,
      item.cuenta_compra_nombre,
    ),
    cuenta_costo_venta: cuentaOption(
      item.cuenta_costo_venta,
      item.cuenta_costo_venta_codigo,
      item.cuenta_costo_venta_nombre,
    ),
    cuenta_inventario: cuentaOption(
      item.cuenta_inventario,
      item.cuenta_inventario_codigo,
      item.cuenta_inventario_nombre,
    ),
  };
}

/** Ids de impuesto únicos a partir de las dos listas (venta + compra). */
export function impuestoIdsFromForm(v: ItemFormRawValue): number[] {
  const ids = [...v.impuestos_venta, ...v.impuestos_compra].map((o) => o.id);
  return [...new Set(ids)];
}

/**
 * Construye el write-model (`ItemPayload`) a partir del valor crudo del form.
 *
 * Reglas:
 * - `producto`/`servicio` se derivan del control `tipo` (excluyentes).
 * - Si es servicio, `inventario` se fuerza a `false` (no maneja existencias).
 * - Los strings vacíos se normalizan a `null`.
 * - Las cuentas exponen sólo su `id` (o `null`).
 * - `impuestos_ids` es la unión deduplicada de venta + compra.
 */
export function formValueToPayload(v: ItemFormRawValue): ItemPayload {
  const esServicio = v.tipo === 'servicio';

  return {
    codigo: v.codigo ?? '',
    nombre: v.nombre ?? '',
    referencia: v.referencia || null,
    precio: v.precio ?? 0,
    costo: v.costo ?? 0,
    producto: !esServicio,
    servicio: esServicio,
    inventario: esServicio ? false : (v.inventario ?? false),
    negativo: v.negativo ?? false,
    venta: v.venta ?? false,
    favorito: v.favorito ?? false,
    inactivo: v.inactivo ?? false,
    cuenta_venta: v.cuenta_venta?.id ?? null,
    cuenta_compra: v.cuenta_compra?.id ?? null,
    cuenta_costo_venta: v.cuenta_costo_venta?.id ?? null,
    cuenta_inventario: v.cuenta_inventario?.id ?? null,
    impuestos_ids: impuestoIdsFromForm(v),
  };
}
