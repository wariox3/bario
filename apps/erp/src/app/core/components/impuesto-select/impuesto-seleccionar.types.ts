import type { TasaImpuesto } from '@reddoc/core';

/** Endpoint del catálogo de impuestos. Única declaración: la comparten el
 * selector (`app-impuesto-select`) y quien precargue el pool para pasárselo. */
export const IMPUESTO_SELECCIONAR_ENDPOINT = '/general/impuesto/seleccionar/';

/**
 * Fila del endpoint `general/impuesto/seleccionar/`. Además de `{ id, nombre }`
 * (lo que muestra el dropdown) trae la **tasa** del impuesto, fuente autoritativa
 * para calcular el monto de cualquier impuesto elegido en la línea —no solo los
 * configurados en el ítem.
 */
export interface ImpuestoSeleccionarOption {
  readonly id: number;
  /** Nombre corto (`"IVA"`). Para mostrar se usa `nombre_extendido`. */
  readonly nombre: string;
  /** Nombre para mostrar (`"IVA 19% ventas"`). Es lo que ven badges y resumen. */
  readonly nombre_extendido?: string | null;
  /** Porcentaje del impuesto, e.g. `"19.00"`. */
  readonly porcentaje?: string | null;
  /** Porcentaje de la base sobre la que aplica, e.g. `"100.00"`. */
  readonly porcentaje_base?: string | null;
  /** Operación sobre el total: `1` suma, `-1` resta (retención). */
  readonly operacion?: number | null;
}

/** Opción del catálogo `impuesto/seleccionar/` → `TasaImpuesto` (base 100 por defecto). */
export function tasaFromImpuestoOption(opt: ImpuestoSeleccionarOption): TasaImpuesto {
  return {
    id: opt.id,
    nombre: opt.nombre_extendido ?? opt.nombre,
    porcentaje: parseFloat(opt.porcentaje ?? '0'),
    porcentajeBase: parseFloat(opt.porcentaje_base ?? '100'),
    operacion: opt.operacion ?? 1,
  };
}
