import { fromIsoDate, toIsoDate } from '@reddoc/core';
import type { Precio, PrecioPayload } from './precio.model';
import type { PrecioFormRawValue } from './pages/precio-form/precio-form.types';

/** Adapta el read-model (`Precio`) a los valores del reactive form. */
export function precioToFormValue(p: Precio): Partial<PrecioFormRawValue> {
  return {
    nombre: p.nombre,
    fecha_vence: fromIsoDate(p.fecha_vence),
  };
}

/**
 * Construye el write-model (`PrecioPayload`) desde el valor crudo del form.
 * La fecha Date → 'yyyy-mm-dd' (o `null` si vacía).
 *
 * `venta` y `compra` viajan fijos y no se preguntan en pantalla: una lista de
 * precios creada desde el ERP es de venta. Es lo mismo que hace el ERP anterior
 * —los declara en su `FormGroup` con estos valores y nunca los pinta— y lo que
 * mantiene el payload completo para el backend, que sí espera los dos campos.
 */
export function formValueToPayload(v: PrecioFormRawValue): PrecioPayload {
  return {
    nombre: v.nombre ?? '',
    venta: true,
    compra: false,
    fecha_vence: toIsoDate(v.fecha_vence),
  };
}
