import { applyClientFilters, matchesCondition } from './match-conditions';

interface Row {
  readonly nombre: string;
  readonly correo: string | null;
  readonly rol_id: number;
  readonly activo: boolean;
}

const ROWS: readonly Row[] = [
  { nombre: 'Ana Pérez', correo: 'ana@reddoc.uk', rol_id: 1, activo: true },
  { nombre: 'Bruno Díaz', correo: null, rol_id: 2, activo: false },
  { nombre: 'Carla Ruiz', correo: 'carla@reddoc.uk', rol_id: 2, activo: true },
];

describe('matchesCondition', () => {
  it('compara texto sin distinguir mayúsculas', () => {
    const row = ROWS[0];
    expect(matchesCondition(row, { field: 'nombre', operator: 'contains', value: 'PÉREZ' })).toBe(
      true,
    );
    expect(matchesCondition(row, { field: 'nombre', operator: 'eq', value: 'ana pérez' })).toBe(
      true,
    );
    expect(matchesCondition(row, { field: 'nombre', operator: 'startsWith', value: 'ana' })).toBe(
      true,
    );
    expect(matchesCondition(row, { field: 'correo', operator: 'endsWith', value: '.uk' })).toBe(
      true,
    );
  });

  it('trata null y string vacío como vacío en isNull', () => {
    expect(matchesCondition(ROWS[1], { field: 'correo', operator: 'isNull', value: true })).toBe(
      true,
    );
    expect(matchesCondition(ROWS[0], { field: 'correo', operator: 'isNull', value: true })).toBe(
      false,
    );
    expect(matchesCondition(ROWS[0], { field: 'correo', operator: 'isNull', value: false })).toBe(
      true,
    );
    expect(
      matchesCondition({ correo: '   ' }, { field: 'correo', operator: 'isNull', value: true }),
    ).toBe(true);
  });

  it('compara números por valor, no por texto', () => {
    expect(matchesCondition({ n: 10 }, { field: 'n', operator: 'gt', value: 9 })).toBe(true);
    // Lexicográficamente '10' < '9'; numéricamente no.
    expect(matchesCondition({ n: 10 }, { field: 'n', operator: 'lt', value: 9 })).toBe(false);
    expect(matchesCondition({ n: 10 }, { field: 'n', operator: 'gte', value: 10 })).toBe(true);
    expect(matchesCondition({ n: 10 }, { field: 'n', operator: 'lte', value: 10 })).toBe(true);
  });

  it('compara booleanos por valor cuando el filtro trae un booleano fijo', () => {
    expect(matchesCondition(ROWS[0], { field: 'activo', operator: 'eq', value: true })).toBe(true);
    expect(matchesCondition(ROWS[1], { field: 'activo', operator: 'eq', value: true })).toBe(false);
    expect(matchesCondition(ROWS[1], { field: 'activo', operator: 'neq', value: true })).toBe(true);
  });

  it('resuelve `in` contra una lista de opciones', () => {
    expect(matchesCondition(ROWS[1], { field: 'rol_id', operator: 'in', value: [2, 3] })).toBe(
      true,
    );
    expect(matchesCondition(ROWS[0], { field: 'rol_id', operator: 'in', value: [2, 3] })).toBe(
      false,
    );
  });

  it('lee paths con punto y no explota con campos ausentes', () => {
    expect(
      matchesCondition(
        { usuario: { nombre: 'Ana' } },
        { field: 'usuario.nombre', operator: 'eq', value: 'ana' },
      ),
    ).toBe(true);
    expect(matchesCondition({}, { field: 'a.b.c', operator: 'isNull', value: true })).toBe(true);
  });
});

describe('applyClientFilters', () => {
  it('devuelve la misma referencia cuando no hay condiciones', () => {
    expect(applyClientFilters(ROWS, [])).toBe(ROWS);
  });

  it('acumula las condiciones con AND', () => {
    const result = applyClientFilters(ROWS, [
      { field: 'rol_id', operator: 'eq', value: 2 },
      { field: 'correo', operator: 'isNull', value: false },
    ]);
    expect(result.map((r) => r.nombre)).toEqual(['Carla Ruiz']);
  });

  it('filtra por búsqueda rápida sobre un campo de texto', () => {
    const result = applyClientFilters(ROWS, [
      { field: 'nombre', operator: 'contains', value: 'ru' },
    ]);
    // Coincide en cualquier posición y sin distinguir mayúsculas: "Bruno" y "Ruiz".
    expect(result.map((r) => r.nombre)).toEqual(['Bruno Díaz', 'Carla Ruiz']);
  });
});
