import {
  formatFechaCorta,
  getOperatorsForType,
  type FilterCondition,
  type FilterField,
} from '@reddoc/core';

/**
 * Condición activa lista para pintar como píldora bajo el toolbar: campo,
 * operador y valor ya traducidos y formateados.
 */
export interface FilterChip {
  /** Posición de la condición en el array original (para quitarla). */
  readonly index: number;
  readonly field: string;
  readonly operator: string;
  /** Vacío cuando el operador no toma valor («está vacío», booleanos). */
  readonly value: string;
}

/** Cuántos valores de un filtro «en» se muestran antes de resumir con «+N». */
const MAX_IN_VALUES = 2;

/**
 * Traduce las condiciones activas a píldoras. Las que apuntan a un campo que
 * el listado ya no declara se descartan: no hay etiqueta honesta para ellas y
 * el modal tampoco las muestra.
 */
export function buildFilterChips(
  conditions: readonly FilterCondition[],
  fields: readonly FilterField[],
  translate: (key: string) => string,
): FilterChip[] {
  const chips: FilterChip[] = [];
  conditions.forEach((cond, index) => {
    const field = fields.find((f) => f.name === cond.field);
    if (!field) return;
    const def = getOperatorsForType(field.type).find(
      (op) =>
        op.operator === cond.operator && (op.valueKind !== 'none' || op.fixedValue === cond.value),
    );
    chips.push({
      index,
      field: translate(field.displayNameKey),
      operator: def ? translate(def.labelKey) : cond.operator,
      value: def?.valueKind === 'none' ? '' : formatValue(cond.value, field.type),
    });
  });
  return chips;
}

function formatValue(value: FilterCondition['value'], type: FilterField['type']): string {
  if (Array.isArray(value)) {
    const shown = value.slice(0, MAX_IN_VALUES).map((v) => formatValue(v, type));
    const rest = value.length - shown.length;
    return rest > 0 ? `${shown.join(', ')} +${rest}` : shown.join(', ');
  }
  if (type === 'date' && typeof value === 'string') return formatFechaCorta(value, value);
  return String(value);
}
