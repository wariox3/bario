import {
  BACKEND_OPERATOR,
  LIST_PAGINATION_PARAMS,
  buildFiltros,
  buildListBody,
  buildListParams,
  buildOrdenamientos,
} from './build-list-body';
import type { FilterCondition, ListQuery, SortSpec } from './list-query.types';

describe('BACKEND_OPERATOR', () => {
  it('mapea cada operador semántico al vocabulario autoritativo del backend', () => {
    expect(BACKEND_OPERATOR).toEqual({
      eq: '=',
      neq: '!=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
      contains: 'contiene',
      startsWith: 'comienza_con',
      endsWith: 'termina_con',
      in: 'in',
      isNull: 'is_null',
    });
  });
});

describe('buildFiltros', () => {
  it('traduce field/operator/value a propiedad/operador/valor', () => {
    const filters: FilterCondition[] = [
      { field: 'nombre_corto', operator: 'contains', value: 'm' },
    ];
    expect(buildFiltros(filters)).toEqual([
      { propiedad: 'nombre_corto', operador: 'contiene', valor: 'm' },
    ]);
  });

  it('serializa booleanos (eq true/false) tal cual', () => {
    const filters: FilterCondition[] = [
      { field: 'cliente', operator: 'eq', value: true },
      { field: 'proveedor', operator: 'eq', value: false },
    ];
    expect(buildFiltros(filters)).toEqual([
      { propiedad: 'cliente', operador: '=', valor: true },
      { propiedad: 'proveedor', operador: '=', valor: false },
    ]);
  });

  it('emite operador_logico solo cuando la condición lo declara', () => {
    const filters: FilterCondition[] = [
      { field: 'cuenta__codigo', operator: 'gte', value: '1105' },
      { field: 'cuenta__codigo', operator: 'lte', value: '1199', logic: 'AND' },
    ];
    expect(buildFiltros(filters)).toEqual([
      { propiedad: 'cuenta__codigo', operador: '>=', valor: '1105' },
      { propiedad: 'cuenta__codigo', operador: '<=', valor: '1199', operador_logico: 'AND' },
    ]);
  });

  it('no agrega la clave operador_logico cuando la condición no la trae', () => {
    const [filtro] = buildFiltros([{ field: 'nombre', operator: 'eq', value: 'x' }]);
    expect('operador_logico' in filtro).toBe(false);
  });

  it('serializa is_null con su valor booleano (vacío / no vacío)', () => {
    const filters: FilterCondition[] = [
      { field: 'correo', operator: 'isNull', value: true },
      { field: 'celular', operator: 'isNull', value: false },
    ];
    expect(buildFiltros(filters)).toEqual([
      { propiedad: 'correo', operador: 'is_null', valor: true },
      { propiedad: 'celular', operador: 'is_null', valor: false },
    ]);
  });

  it('serializa listas (operador in) a CSV', () => {
    const filters: FilterCondition[] = [{ field: 'id', operator: 'in', value: [1, 2, 3] }];
    expect(buildFiltros(filters)).toEqual([{ propiedad: 'id', operador: 'in', valor: '1,2,3' }]);
  });
});

describe('buildOrdenamientos', () => {
  it('antepone "-" a los descendentes y respeta el orden de prioridad', () => {
    const sort: SortSpec[] = [
      { field: 'nombre_corto', direction: 'desc' },
      { field: 'id', direction: 'asc' },
    ];
    expect(buildOrdenamientos(sort)).toEqual(['-nombre_corto', 'id']);
  });

  it('devuelve [] cuando no hay orden', () => {
    expect(buildOrdenamientos([])).toEqual([]);
  });
});

describe('buildListBody', () => {
  const baseQuery: ListQuery = {
    filters: [{ field: 'nombre_corto', operator: 'contains', value: 'm' }],
    sort: [{ field: 'nombre_corto', direction: 'desc' }],
    page: 0,
    pageSize: 25,
  };

  it('arma el body solo con filtros y ordenamientos (paginación va en query params)', () => {
    expect(buildListBody(baseQuery)).toEqual({
      filtros: [{ propiedad: 'nombre_corto', operador: 'contiene', valor: 'm' }],
      ordenamientos: ['-nombre_corto'],
    });
  });

  it('antepone los baseFilters a los del usuario', () => {
    const body = buildListBody(baseQuery, {
      baseFilters: [{ field: 'documento_tipo_id', operator: 'eq', value: 7 }],
    });
    expect(body.filtros).toEqual([
      { propiedad: 'documento_tipo_id', operador: '=', valor: 7 },
      { propiedad: 'nombre_corto', operador: 'contiene', valor: 'm' },
    ]);
  });
});

describe('buildListParams', () => {
  const baseQuery: ListQuery = {
    filters: [],
    sort: [],
    page: 0,
    pageSize: 25,
  };

  it('convierte la página 0-based a 1-based bajo la key "page"', () => {
    expect(buildListParams({ ...baseQuery, page: 2 })[LIST_PAGINATION_PARAMS.page]).toBe(3);
  });

  it('expone el tamaño de página bajo la key de tamaño ("limit")', () => {
    expect(buildListParams({ ...baseQuery, pageSize: 50 })[LIST_PAGINATION_PARAMS.size]).toBe(50);
  });

  it('arma el set completo de params de paginación', () => {
    expect(buildListParams(baseQuery)).toEqual({ page: 1, limit: 25 });
  });
});
