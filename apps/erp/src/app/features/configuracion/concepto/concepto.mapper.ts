import { formatNumber } from '@angular/common';
import { toFiniteNumber } from '@reddoc/core';
import type { Concepto, ConceptoRow } from './concepto.model';

/**
 * Fila del backend → fila de la tabla, con el porcentaje como `66,67 %`. Usa el
 * mismo formato que las columnas numéricas de la tabla (hasta dos decimales).
 */
export function toConceptoRow(concepto: Concepto, locale: string): ConceptoRow {
  const porcentaje = toFiniteNumber(concepto.porcentaje);
  return {
    ...concepto,
    porcentaje_label: porcentaje === null ? '' : `${formatNumber(porcentaje, locale, '1.0-2')} %`,
  };
}
