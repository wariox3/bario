import type { FilterField } from '@reddoc/core';
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
    expect(chips).toEqual([{ index: 0, field: 'nombre', operator: 'contiene', value: 'perez' }]);
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

  it('resume los filtros «en» largos', () => {
    const [chip] = buildFilterChips(
      [{ field: 'id', operator: 'in', value: [1, 2, 3, 4] }],
      FIELDS,
      translate,
    );
    expect(chip.value).toBe('1, 2 +2');
  });

  it('descarta campos que el listado no declara y conserva el índice original', () => {
    const chips = buildFilterChips(
      [
        { field: 'viejo', operator: 'eq', value: 1 },
        { field: 'id', operator: 'eq', value: 7 },
      ],
      FIELDS,
      translate,
    );
    expect(chips).toEqual([{ index: 1, field: 'id', operator: 'es', value: '7' }]);
  });
});
