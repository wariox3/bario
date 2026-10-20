import type { FilterCondition, FilterField } from '@reddoc/core';
import {
  conditionsToDraft,
  draftToConditions,
  fieldTypeOf,
  initialDraft,
  newRowForField,
  type DraftRow,
} from './data-filter.logic';

const FIELDS: readonly FilterField[] = [
  { name: 'nombre_corto', displayNameKey: 'x.nombre', type: 'string' },
  { name: 'id', displayNameKey: 'x.id', type: 'number' },
  { name: 'cliente', displayNameKey: 'x.cliente', type: 'boolean' },
];

describe('fieldTypeOf', () => {
  it('resuelve el tipo del campo y cae a string si no existe', () => {
    expect(fieldTypeOf(FIELDS, 'id')).toBe('number');
    expect(fieldTypeOf(FIELDS, 'desconocido')).toBe('string');
  });
});

describe('newRowForField', () => {
  it('inicializa con el primer operador del tipo y valor vacío', () => {
    expect(newRowForField(FIELDS[0])).toEqual({
      field: 'nombre_corto',
      opId: 'contiene',
      value: '',
    });
    expect(newRowForField(FIELDS[2])).toEqual({ field: 'cliente', opId: 'esVerdadero', value: '' });
  });
});

describe('draftToConditions', () => {
  it('construye condiciones con coerción numérica', () => {
    const rows: DraftRow[] = [
      { field: 'nombre_corto', opId: 'contiene', value: 'm' },
      { field: 'id', opId: 'mayor', value: '10' },
    ];
    expect(draftToConditions(rows, FIELDS)).toEqual([
      { field: 'nombre_corto', operator: 'contains', value: 'm' },
      { field: 'id', operator: 'gt', value: 10 },
    ]);
  });

  it('usa fixedValue para operadores sin valor (booleanos / is_null)', () => {
    const rows: DraftRow[] = [
      { field: 'cliente', opId: 'esVerdadero', value: '' },
      { field: 'nombre_corto', opId: 'vacio', value: '' },
    ];
    expect(draftToConditions(rows, FIELDS)).toEqual([
      { field: 'cliente', operator: 'eq', value: true },
      { field: 'nombre_corto', operator: 'isNull', value: true },
    ]);
  });

  it('descarta filas con valor requerido vacío', () => {
    const rows: DraftRow[] = [{ field: 'nombre_corto', opId: 'contiene', value: '   ' }];
    expect(draftToConditions(rows, FIELDS)).toEqual([]);
  });

  it('descarta filas con operador inexistente', () => {
    const rows: DraftRow[] = [{ field: 'nombre_corto', opId: 'no_existe', value: 'm' }];
    expect(draftToConditions(rows, FIELDS)).toEqual([]);
  });

  it('no falla si el value llega como número (input numérico) y lo coerce', () => {
    // El NumberValueAccessor de Angular emite `number`, no `string`; antes esto
    // hacía `(5).trim()` → TypeError y el filtro por ID nunca se aplicaba.
    const rows = [{ field: 'id', opId: 'es', value: 5 as unknown as string }];
    expect(() => draftToConditions(rows, FIELDS)).not.toThrow();
    expect(draftToConditions(rows, FIELDS)).toEqual([{ field: 'id', operator: 'eq', value: 5 }]);
  });
});

describe('conditionsToDraft', () => {
  it('es el inverso de draftToConditions para condiciones válidas', () => {
    const conditions: FilterCondition[] = [
      { field: 'nombre_corto', operator: 'contains', value: 'm' },
      { field: 'cliente', operator: 'eq', value: false },
      { field: 'nombre_corto', operator: 'isNull', value: true },
    ];
    expect(conditionsToDraft(conditions, FIELDS)).toEqual([
      { field: 'nombre_corto', opId: 'contiene', value: 'm' },
      { field: 'cliente', opId: 'esFalso', value: '' },
      { field: 'nombre_corto', opId: 'vacio', value: '' },
    ]);
  });

  it('ignora condiciones sobre campos desconocidos', () => {
    const conditions: FilterCondition[] = [{ field: 'fantasma', operator: 'eq', value: 1 }];
    expect(conditionsToDraft(conditions, FIELDS)).toEqual([]);
  });
});

describe('initialDraft', () => {
  it('abre con los filtros activos cuando los hay', () => {
    const conditions: FilterCondition[] = [{ field: 'id', operator: 'gt', value: 10 }];
    expect(initialDraft(conditions, FIELDS)).toEqual([{ field: 'id', opId: 'mayor', value: '10' }]);
  });

  it('sin filtros activos abre con una condición sobre el primer campo', () => {
    expect(initialDraft([], FIELDS)).toEqual([
      { field: 'nombre_corto', opId: 'contiene', value: '' },
    ]);
  });

  it('no agrega la condición si el primer campo no pide valor', () => {
    expect(initialDraft([], [FIELDS[2], FIELDS[0]])).toEqual([]);
  });

  it('no agrega nada si no hay campos', () => {
    expect(initialDraft([], [])).toEqual([]);
  });
});
