import type { ListQuery } from '../../data-list';
import { alcanceImpresion } from './alcance-impresion';

const FILTRADO: ListQuery = {
  filters: [{ field: 'contacto_id', operator: 'eq', value: 3 }],
  sort: [],
  page: 0,
};
const SIN_FILTROS: ListQuery = { ...FILTRADO, filters: [] };

describe('alcanceImpresion', () => {
  it('sin selección ni filtros no imprime', () => {
    expect(alcanceImpresion(SIN_FILTROS, [], 300)).toEqual({ tipo: 'sin-criterio' });
  });

  it('con filtros que no dejan nada avisa que está vacío', () => {
    expect(alcanceImpresion(FILTRADO, [], 0)).toEqual({ tipo: 'vacio' });
  });

  it('sin selección imprime lo filtrado tal cual', () => {
    expect(alcanceImpresion(FILTRADO, [], 12)).toEqual({
      tipo: 'imprimir',
      query: FILTRADO,
      cantidad: 12,
      confirmar: false,
    });
  });

  it('con selección imprime solo esa, con el id como array, aunque no haya filtros', () => {
    expect(alcanceImpresion(SIN_FILTROS, [4, 9], 300)).toEqual({
      tipo: 'imprimir',
      query: { ...SIN_FILTROS, filters: [{ field: 'id', operator: 'in', value: [4, 9] }] },
      cantidad: 2,
      confirmar: false,
    });
  });

  it('pide confirmación por encima de 50', () => {
    expect(alcanceImpresion(FILTRADO, [], 50)).toMatchObject({ confirmar: false });
    expect(alcanceImpresion(FILTRADO, [], 51)).toMatchObject({ confirmar: true });
  });
});
