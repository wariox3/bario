import { Suscripcion } from '../models/suscripcion.model';
import { SUSCRIPCION_CLASE, SuscripcionTipo } from '../models/suscripcion-tipo.model';

/**
 * Cómo se elige el plan al actualizar una suscripción, según la clase de su tipo:
 *
 * - `catalogo`: la persona escoge entre los planes comerciales (clase 1).
 * - `fijo`: el plan es el que ya tiene; solo se renueva, y el precio sale de un campo
 *   de la propia suscripción (`precioDe`).
 */
export type ModoSeleccionPlan =
  | { readonly tipo: 'catalogo' }
  | {
      readonly tipo: 'fijo';
      readonly precioDe: (s: Suscripcion) => string | null;
      /** Rótulo corto de la clase, sobre el nombre del plan. */
      readonly etiqueta: string;
      /** Por qué no se elige del catálogo, en palabras de la persona. */
      readonly descripcion: string;
    };

const MODO_CATALOGO: ModoSeleccionPlan = { tipo: 'catalogo' };

const MODO_POR_CLASE: Readonly<Record<number, ModoSeleccionPlan>> = {
  [SUSCRIPCION_CLASE.COMERCIAL]: MODO_CATALOGO,
  [SUSCRIPCION_CLASE.PERSONALIZADO]: {
    tipo: 'fijo',
    precioDe: (s) => s.precio,
    etiqueta: 'Plan personalizado',
    descripcion: 'Tu plan tiene un precio acordado contigo. Renuévalo eligiendo cada cuánto pagar.',
  },
  [SUSCRIPCION_CLASE.CONTADOR]: {
    tipo: 'fijo',
    precioDe: (s) => s.suscripcion_tipo_precio,
    etiqueta: 'Plan contador',
    descripcion:
      'Tu plan es para contadores y no cambia de catálogo. Renuévalo eligiendo cada cuánto pagar.',
  },
};

/** Una clase sin regla (o sin clase) cae al catálogo, que es el comportamiento de siempre. */
export function modoSeleccionPlan(suscripcion: Suscripcion): ModoSeleccionPlan {
  const clase = suscripcion.suscripcion_tipo_suscripcion_clase_id;
  return (clase !== null && MODO_POR_CLASE[clase]) || MODO_CATALOGO;
}

export interface PlanFijo {
  readonly plan: SuscripcionTipo;
  readonly etiqueta: string;
  readonly descripcion: string;
}

/**
 * Arma el plan de una suscripción de plan fijo con la misma forma que los del catálogo,
 * para que tarjeta, resumen, cálculo del cambio y cobro funcionen sin ramas propias.
 * Devuelve `null` en modo catálogo.
 */
export function planFijoDeSuscripcion(suscripcion: Suscripcion): PlanFijo | null {
  const modo = modoSeleccionPlan(suscripcion);
  if (modo.tipo !== 'fijo') return null;
  return {
    plan: {
      id: suscripcion.suscripcion_tipo,
      nombre: suscripcion.suscripcion_tipo_nombre,
      precio: modo.precioDe(suscripcion) ?? '0',
      suscripcion_clase_id: suscripcion.suscripcion_tipo_suscripcion_clase_id ?? 0,
      suscripcion_categoria_id: suscripcion.suscripcion_tipo_suscripcion_categoria_id ?? 0,
    },
    etiqueta: modo.etiqueta,
    descripcion: modo.descripcion,
  };
}
