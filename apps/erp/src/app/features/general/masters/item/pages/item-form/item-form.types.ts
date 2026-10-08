import type { ErpSelectOption } from '@reddoc/core';

/** Discriminador producto/servicio del item (control `tipo` del form). */
export type ItemTipo = 'producto' | 'servicio';

/**
 * Forma cruda del FormGroup del item (lo que devuelve `form.getRawValue()`).
 *
 * Los autocompletes de cuenta devuelven el `ErpSelectOption` seleccionado; los
 * multiselect de impuestos devuelven un arreglo de `ErpSelectOption`; los campos
 * de texto/número devuelven su primitivo.
 */
export interface ItemFormRawValue {
  readonly codigo: string | null;
  readonly nombre: string | null;
  readonly referencia: string | null;
  readonly tipo: ItemTipo;
  readonly precio: number | null;
  readonly costo: number | null;
  readonly inventario: boolean | null;
  readonly negativo: boolean | null;
  readonly venta: boolean | null;
  readonly favorito: boolean | null;
  readonly inactivo: boolean | null;
  // Mutables: son el valor de un control multiselect (PrimeNG muta el arreglo).
  readonly impuestos_venta: ErpSelectOption[];
  readonly impuestos_compra: ErpSelectOption[];
  readonly cuenta_venta: ErpSelectOption | null;
  readonly cuenta_compra: ErpSelectOption | null;
  readonly cuenta_costo_venta: ErpSelectOption | null;
  readonly cuenta_inventario: ErpSelectOption | null;
}
