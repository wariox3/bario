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
  /**
   * Posición entre las condiciones que se pintan. Coincide con la fila del
   * modal porque ambos descartan las mismas condiciones; es la que se usa para
   * enfocar su valor al editar.
   */
  readonly row: number;
  readonly field: string;
  readonly operator: string;
  /** Vacío cuando el operador no toma valor («está vacío», booleanos). */
  readonly value: string;
}

/**
 * Traduce las condiciones activas a píldoras. Se descartan las mismas que
 * descarta el modal (`conditionsToDraft`): campo que el listado ya no declara u
 * operador fuera del catálogo. No hay etiqueta honesta para ellas, y descartar
 * igual que el modal mantiene alineado `row` con sus filas.
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
    if (!def) return;
    chips.push({
      index,
      row: chips.length,
      field: translate(field.displayNameKey),
      operator: translate(def.labelKey),
      value: def.valueKind === 'none' ? '' : formatValue(cond.value, field.type),
    });
  });
  return chips;
}

function formatValue(value: FilterCondition['value'], type: FilterField['type']): string {
  if (type === 'date' && typeof value === 'string') return formatFechaCorta(value, value);
  return String(value);
}
