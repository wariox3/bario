import { firstValueFrom, of } from 'rxjs';
import type { PaginatedResponse } from '../../models/pagination.model';
import { fetchAllPages } from './fetch-all-pages';

function pagina(results: number[], hayMas: boolean): PaginatedResponse<number> {
  return { count: 0, next: hayMas ? 'siguiente' : null, previous: null, results };
}

describe('fetchAllPages', () => {
  it('recorre las páginas mientras haya `next` y junta las filas en orden', async () => {
    const pedidas: number[] = [];
    const paginas: Record<number, PaginatedResponse<number>> = {
      1: pagina([1, 2], true),
      2: pagina([3, 4], true),
      3: pagina([5], false),
    };
    const todo = await firstValueFrom(
      fetchAllPages((page) => {
        pedidas.push(page);
        return of(paginas[page]);
      }),
    );
    expect(pedidas).toEqual([1, 2, 3]);
    expect(todo).toEqual([1, 2, 3, 4, 5]);
  });

  it('con una sola página pide una vez', async () => {
    const todo = await firstValueFrom(fetchAllPages(() => of(pagina([7], false))));
    expect(todo).toEqual([7]);
  });
});

describe('fetchAllPages con max', () => {
  it('deja de pedir al alcanzar el tope y recorta el sobrante', async () => {
    const pedidas: number[] = [];
    const todo = await firstValueFrom(
      fetchAllPages(
        (page) => {
          pedidas.push(page);
          return of(pagina([page * 10 + 1, page * 10 + 2], true));
        },
        { max: 3 },
      ),
    );
    expect(pedidas).toEqual([1, 2]);
    expect(todo).toEqual([11, 12, 21]);
  });
});
