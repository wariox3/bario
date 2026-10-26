import type { FilterField } from '@reddoc/core';
import { conditionsToDraft } from '../data-filter/data-filter.logic';
import { buildFilterChips } from './filter-chips';

const FIELDS: readonly FilterField[] = [
  { name: 'nombre', displayNameKey: 'f.nombre', type: 'string' },
  { name: 'fecha', displayNameKey: 'f.fecha', type: 'date' },
  { name: 'cliente', displayNameKey: 'f.cliente', type: 'boolean' },
  { name: 'id', displayNameKey: 'f.id', type: 'number' },
];

const translate = (key: string): string => key.split('.').pop() ?? key;

describe('buildFilterChips', () => {
  it('traduce campo y operador y deja el valor de texto tal cual', () => {
    const chips = buildFilterChips(
      [{ field: 'nombre', operator: 'contains', value: 'perez' }],
      FIELDS,
      translate,
    );
    expect(chips).toEqual([
      { index: 0, row: 0, field: 'nombre', operator: 'contiene', value: 'perez' },
    ]);
  });

  it('formatea las fechas en formato corto', () => {
    const [chip] = buildFilterChips(
      [{ field: 'fecha', operator: 'gte', value: '2026-08-05' }],
      FIELDS,
      translate,
    );
    expect(chip.value).toBe('05/08/2026');
  });

  it('deja sin valor los operadores que no lo toman', () => {
    const chips = buildFilterChips(
      [
        { field: 'cliente', operator: 'eq', value: false },
        { field: 'nombre', operator: 'isNull', value: true },
      ],
      FIELDS,
      translate,
    );
    expect(chips.map((c) => [c.operator, c.value])).toEqual([
      ['esFalso', ''],
      ['vacio', ''],
    ]);
  });

  it('descarta lo mismo que el modal: la fila coincide con la del modal', () => {
    const conditions = [
      { field: 'viejo', operator: 'eq', value: 1 },
      { field: 'id', operator: 'contains', value: 3 },
      { field: 'id', operator: 'in', value: [1, 2] },
      { field: 'id', operator: 'eq', value: 7 },
    ] as const;
    const chips = buildFilterChips(conditions, FIELDS, translate);
    expect(chips).toEqual([{ index: 3, row: 0, field: 'id', operator: 'es', value: '7' }]);
    expect(conditionsToDraft(conditions, FIELDS)).toHaveLength(chips.length);
  });
});
