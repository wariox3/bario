import {
  getOperatorDef,
  getOperatorsForType,
  type FilterCondition,
  type FilterField,
  type FilterFieldType,
} from '@reddoc/core';

/**
 * Lógica pura del constructor de filtros, aislada del componente para poder
 * testearla sin TestBed ni PrimeNG. Convierte entre el modelo editable de la UI
 * (`DraftRow[]`, strings) y el contrato de dominio (`FilterCondition[]`).
 */

/**
 * Fila editable del borrador. Se mantiene un modelo de strings (incluso para
 * números/fechas); la coerción al tipo real ocurre al construir las condiciones.
 */
export interface DraftRow {
  /** `name` del `FilterField` seleccionado. */
  field: string;
  /** `id` del operador (dentro del tipo del campo). */
  opId: string;
  /** Valor crudo del input (`''` si el operador no toma valor). */
  value: string;
}

/** Tipo del campo cuyo `name` se indica; `'string'` por defecto si no existe. */
export function fieldTypeOf(fields: readonly FilterField[], fieldName: string): FilterFieldType {
  return fields.find((f) => f.name === fieldName)?.type ?? 'string';
}

/** Nueva fila para un campo: su primer operador disponible y valor vacío. */
export function newRowForField(field: FilterField): DraftRow {
  const ops = getOperatorsForType(field.type);
  return { field: field.name, opId: ops[0]?.id ?? '', value: '' };
}

/**
 * Borrador con el que abre el modal: los filtros activos o, si no hay ninguno,
 * una condición ya puesta sobre el primer campo para ahorrar el clic en
 * "Añadir condición". Solo se agrega si su operador inicial pide un valor: una
 * fila sin valor (booleano, "está vacío") se aplicaría tal cual al confirmar,
 * filtrando algo que la persona no eligió.
 */
export function initialDraft(
  conditions: readonly FilterCondition[],
  fields: readonly FilterField[],
): DraftRow[] {
  const rows = conditionsToDraft(conditions, fields);
  if (rows.length > 0) return rows;
  const first = fields[0];
  if (!first || getOperatorsForType(first.type)[0]?.valueKind === 'none') return [];
  return [newRowForField(first)];
}

/**
 * Traduce el borrador a `FilterCondition[]`:
 *  - descarta filas con operador inexistente o con valor requerido vacío;
 *  - aplica `fixedValue` para operadores sin valor (booleanos / is_null);
 *  - coerciona a número cuando el operador espera un valor numérico.
 */
export function draftToConditions(
  rows: readonly DraftRow[],
  fields: readonly FilterField[],
): FilterCondition[] {
  const conditions: FilterCondition[] = [];
  for (const row of rows) {
    const type = fieldTypeOf(fields, row.field);
    const def = getOperatorDef(type, row.opId);
    if (!def) continue;
    if (def.valueKind === 'none') {
      conditions.push({ field: row.field, operator: def.operator, value: def.fixedValue ?? true });
      continue;
    }
    // `String(...)` defensivo: el value puede llegar como número (input numérico)
    // o desde datos rehidratados; nunca asumimos que ya es string.
    const trimmed = String(row.value ?? '').trim();
    if (trimmed === '') continue; // filtro incompleto → se descarta
    conditions.push({
      field: row.field,
      operator: def.operator,
      value: def.valueKind === 'number' ? Number(trimmed) : trimmed,
    });
  }
  return conditions;
}

/**
 * Reconstruye el borrador a partir de los filtros activos. Para cada condición
 * busca el operador del catálogo que coincide por `operator` y, cuando no toma
 * valor, por `fixedValue`. Descarta condiciones sobre campos desconocidos.
 */
export function conditionsToDraft(
  conditions: readonly FilterCondition[],
  fields: readonly FilterField[],
): DraftRow[] {
  const rows: DraftRow[] = [];
  for (const cond of conditions) {
    const field = fields.find((f) => f.name === cond.field);
    if (!field) continue;
    const def = getOperatorsForType(field.type).find(
      (op) =>
        op.operator === cond.operator && (op.valueKind !== 'none' || op.fixedValue === cond.value),
    );
    if (!def) continue;
    rows.push({
      field: cond.field,
      opId: def.id,
      value: def.valueKind === 'none' ? '' : String(cond.value),
    });
  }
  return rows;
}
