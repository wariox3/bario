export interface ModuleSplit<T> {
  readonly visible: readonly T[];
  readonly overflow: readonly T[];
}

/**
 * Reparte los módulos entre la barra y el menú «Más» según el ancho disponible
 * (patrón priority+): entran en orden los que caben y el resto va al menú.
 *
 * El módulo activo nunca queda escondido: si no entró, se desplazan los
 * últimos visibles hasta hacerle lugar. Sin medidas todavía (primer render),
 * se muestran todos.
 */
export function splitModules<T extends { readonly isActive: boolean }>(
  items: readonly T[],
  widths: readonly number[],
  moreWidth: number,
  gap: number,
  available: number,
): ModuleSplit<T> {
  if (available <= 0 || widths.length !== items.length) return { visible: items, overflow: [] };

  const widthOf = (indexes: readonly number[]): number =>
    indexes.reduce((sum, i) => sum + widths[i], 0) + gap * Math.max(indexes.length - 1, 0);

  const all = items.map((_, i) => i);
  if (widthOf(all) <= available) return { visible: items, overflow: [] };

  // El botón «Más» ocupa su ancho y un gap más.
  const budget = available - moreWidth - gap;
  const visible: number[] = [];
  for (const i of all) {
    if (widthOf([...visible, i]) > budget) break;
    visible.push(i);
  }

  const activeIndex = items.findIndex((item) => item.isActive);
  if (activeIndex >= 0 && !visible.includes(activeIndex)) {
    while (visible.length && widthOf([...visible, activeIndex]) > budget) visible.pop();
    visible.push(activeIndex);
  }

  return {
    visible: visible.map((i) => items[i]),
    overflow: all.filter((i) => !visible.includes(i)).map((i) => items[i]),
  };
}
