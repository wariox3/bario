import type { LineaCalculo } from '@reddoc/core';
import type { DetalleFormRawValue } from './servicio-documento-detalle.types';

/** Base gravable de una línea del documento: `cantidad × precio`. */
export function lineAmount(line: Pick<DetalleFormRawValue, 'cantidad' | 'precio'>): number {
  return (line.cantidad ?? 0) * (line.precio ?? 0);
}

/** Adapta una línea del documento al contrato mínimo del kernel de cálculo. */
export function toLineaCalculo(line: DetalleFormRawValue): LineaCalculo {
  return { base: lineAmount(line), impuestos: line.impuestos_totales };
}
