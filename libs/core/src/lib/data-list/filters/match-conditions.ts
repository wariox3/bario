import type { FilterCondition } from '../data/list-query.types';

/**
 * Evaluador **en memoria** del mismo `FilterCondition[]` que produce
 * `<lib-data-filter-modal>` y `quickSearchCondition`.
 *
 * Existe para los listados cuyo endpoint devuelve la colección completa de una
 * (no hay `POST /lista/` con `{filtros}` detrás), como los usuarios de un
 * contenedor: así la pantalla ofrece la **misma UI de filtros** que el resto del
 * ERP sin inventar un mecanismo paralelo. Cuando el backend exponga el listado
 * paginado, el host cambia `applyClientFilters(...)` por el `ListQuery` de
 * siempre y la UI no se entera.
 *
 * Semántica deliberadamente alineada con la del backend (`BACKEND_OPERATOR`):
 * comparación de texto **case-insensitive**, y `isNull` tratando `''` como vacío
 * (el backend devuelve strings vacíos donde el modelo permite nulo).
 */

/** Lee `row[field]`, soportando paths con punto (`usuario.nombre`). */
function readField(row: unknown, field: string): unknown {
  let current: unknown = row;
  for (const part of field.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** Texto comparable: sin espacios en los bordes y en minúsculas. */
function text(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

/** ¿Vacío para efectos de `isNull`? `null`, `undefined` y `''` lo son. */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || text(value) === '';
}

/**
 * Compara dos valores devolviendo el signo de `a - b`.
 * Numérico si ambos son números, si no comparación lexicográfica del texto.
 */
function compare(a: unknown, b: unknown): number {
  const numA = typeof a === 'number' ? a : Number(a);
  const numB = typeof b === 'number' ? b : Number(b);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && text(a) !== '' && text(b) !== '') {
    return numA - numB;
  }
  return text(a).localeCompare(text(b));
}

/** ¿La fila satisface esta condición? */
export function matchesCondition(row: unknown, condition: FilterCondition): boolean {
  const raw = readField(row, condition.field);
  const { operator, value } = condition;

  switch (operator) {
    case 'isNull':
      // `value` booleano indica cuál de las dos preguntas se hace.
      return isEmpty(raw) === (value === true);
    case 'eq':
      return typeof value === 'boolean' ? Boolean(raw) === value : text(raw) === text(value);
    case 'neq':
      return typeof value === 'boolean' ? Boolean(raw) !== value : text(raw) !== text(value);
    case 'contains':
      return text(raw).includes(text(value));
    case 'startsWith':
      return text(raw).startsWith(text(value));
    case 'endsWith':
      return text(raw).endsWith(text(value));
    case 'in':
      return Array.isArray(value) && value.some((option) => text(option) === text(raw));
    case 'gt':
      return compare(raw, value) > 0;
    case 'gte':
      return compare(raw, value) >= 0;
    case 'lt':
      return compare(raw, value) < 0;
    case 'lte':
      return compare(raw, value) <= 0;
  }
}

/**
 * Filtra una colección ya cargada aplicando **todas** las condiciones (AND),
 * igual que hace el backend con el array `filtros`.
 *
 * Sin condiciones devuelve la misma referencia: el host puede usarla dentro de
 * un `computed` sin provocar recálculos en cascada.
 */
export function applyClientFilters<T>(
  rows: readonly T[],
  conditions: readonly FilterCondition[],
): readonly T[] {
  if (conditions.length === 0) return rows;
  return rows.filter((row) => conditions.every((condition) => matchesCondition(row, condition)));
}
