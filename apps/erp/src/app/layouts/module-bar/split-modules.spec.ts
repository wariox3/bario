import { splitModules } from './split-modules';

const mod = (id: string, isActive = false) => ({ id, isActive });
const ids = (items: readonly { id: string }[]) => items.map((m) => m.id);

describe('splitModules', () => {
  const items = [mod('a'), mod('b'), mod('c'), mod('d')];
  const widths = [100, 100, 100, 100];

  it('muestra todos cuando caben', () => {
    const split = splitModules(items, widths, 60, 4, 412);
    expect(ids(split.visible)).toEqual(['a', 'b', 'c', 'd']);
    expect(split.overflow).toEqual([]);
  });

  it('muestra todos mientras no hay medidas', () => {
    expect(ids(splitModules(items, [], 60, 4, 0).visible)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('manda a «Más» los que no caben, en orden', () => {
    // 300 - 60 - 4 = 236 → caben a y b (204).
    const split = splitModules(items, widths, 60, 4, 300);
    expect(ids(split.visible)).toEqual(['a', 'b']);
    expect(ids(split.overflow)).toEqual(['c', 'd']);
  });

  it('nunca esconde el módulo activo', () => {
    const conActivo = [mod('a'), mod('b'), mod('c'), mod('d', true)];
    const split = splitModules(conActivo, widths, 60, 4, 300);
    expect(ids(split.visible)).toEqual(['a', 'd']);
    expect(ids(split.overflow)).toEqual(['b', 'c']);
  });

  it('deja al activo solo cuando no cabe nada más', () => {
    const conActivo = [mod('a'), mod('b', true)];
    const split = splitModules(conActivo, [100, 100], 60, 4, 120);
    expect(ids(split.visible)).toEqual(['b']);
    expect(ids(split.overflow)).toEqual(['a']);
  });
});
