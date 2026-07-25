import { FormControl, FormGroup, Validators } from '@angular/forms';
import type { ErpSelectOption } from '@reddoc/core';
import type { ItemOption } from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';
import type { InventarioDetalleFormRawValue } from './inventario-documento-detalle.types';

/** `FormGroup` tipado de una línea de detalle de inventario. */
export type InventarioDetalleGroup = FormGroup<{
  id: FormControl<number | null>;
  item: FormControl<ItemOption | null>;
  almacen: FormControl<ErpSelectOption | null>;
  cantidad: FormControl<number | null>;
  precio: FormControl<number | null>;
}>;

/**
 * Crea un `FormGroup` de línea de inventario (vacío o precargado en edición).
 *
 * Sin suscripciones internas: a diferencia de la línea comercial, aquí el precio
 * no sale de la opción del autocomplete (que trae el precio de **venta**) sino
 * del **costo** del ítem, que exige una lectura extra —`GET /general/item/:id/`—.
 * Ese cableado vive en la tabla, que sí tiene acceso a los servicios.
 *
 * `almacenPorDefecto` precarga la bodega de la cabecera en las líneas nuevas,
 * como hacía el legacy: lo normal es que todas las líneas entren al mismo
 * almacén, y el usuario cambia solo las excepciones.
 */
export function createInventarioDetalleGroup(
  value?: Partial<InventarioDetalleFormRawValue>,
  almacenPorDefecto?: ErpSelectOption | null,
): InventarioDetalleGroup {
  return new FormGroup({
    id: new FormControl<number | null>(value?.id ?? null),
    item: new FormControl<ItemOption | null>(value?.item ?? null, {
      validators: Validators.required,
    }),
    almacen: new FormControl<ErpSelectOption | null>(value?.almacen ?? almacenPorDefecto ?? null, {
      validators: Validators.required,
    }),
    cantidad: new FormControl<number | null>(value?.cantidad ?? 1, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    precio: new FormControl<number | null>(value?.precio ?? null, {
      validators: [Validators.required, Validators.min(0)],
    }),
  });
}
