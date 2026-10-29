import { barrasCascada, variacionPorcentual } from './cascada';
import type { FilaCascada } from './estado-resultados-tablero.model';

/** La cascada completa con los valores dados, en el orden del backend. */
function cascada(v: {
  ventas: number;
  costo: number;
  gastos: number;
  otros: number;
  impuestos: number;
}): FilaCascada[] {
  const bruta = v.ventas + v.costo;
  const operacional = bruta + v.gastos;
  const neta = operacional + v.otros + v.impuestos;
  return [
    { clave: 'ventas', etiqueta: 'Ventas', valor: v.ventas, tipo: 'entrada' },
    { clave: 'costo_ventas', etiqueta: 'Costo', valor: v.costo, tipo: 'salida' },
    { clave: 'utilidad_bruta', etiqueta: 'Bruta', valor: bruta, tipo: 'subtotal' },
    { clave: 'gastos_operacion', etiqueta: 'Gastos', valor: v.gastos, tipo: 'salida' },
    { clave: 'utilidad_operacional', etiqueta: 'Operac.', valor: operacional, tipo: 'subtotal' },
    { clave: 'otros_netos', etiqueta: 'Otros', valor: v.otros, tipo: 'entrada' },
    { clave: 'impuestos', etiqueta: 'Impuestos', valor: v.impuestos, tipo: 'salida' },
    { clave: 'utilidad_neta', etiqueta: 'Neta', valor: neta, tipo: 'total' },
  ];
}

const tramos = (filas: FilaCascada[]): [number, number][] =>
  barrasCascada(filas).map((b) => [b.inicio, b.fin]);

describe('barrasCascada', () => {
  it('flota entradas y salidas desde el acumulado y para los subtotales en el cero', () => {
    const filas = cascada({ ventas: 1000, costo: -400, gastos: -300, otros: 50, impuestos: -100 });

    expect(tramos(filas)).toEqual([
      [0, 1000],
      [1000, 600],
      [0, 600],
      [600, 300],
      [0, 300],
      [300, 350],
      [350, 250],
      [0, 250],
    ]);
  });

  it('con otros netos negativos, esa barra también baja', () => {
    const filas = cascada({ ventas: 1000, costo: -400, gastos: -300, otros: -80, impuestos: -20 });

    const [, , , , , otros, impuestos, neta] = tramos(filas);
    expect(otros).toEqual([300, 220]);
    expect(impuestos).toEqual([220, 200]);
    expect(neta).toEqual([0, 200]);
  });

  it('con pérdida, el camino cruza el cero y el total queda bajo él', () => {
    const filas = cascada({ ventas: 500, costo: -400, gastos: -300, otros: 0, impuestos: -50 });

    const [, , , gastos, operacional, , impuestos, neta] = tramos(filas);
    expect(gastos).toEqual([100, -200]);
    expect(operacional).toEqual([0, -200]);
    expect(impuestos).toEqual([-200, -250]);
    expect(neta).toEqual([0, -250]);
  });

  it('todo en cero da barras vacías, sin NaN', () => {
    const filas = cascada({ ventas: 0, costo: 0, gastos: 0, otros: 0, impuestos: 0 });

    expect(
      tramos(filas)
        .flat()
        .every((n) => Object.is(Math.abs(n), 0)),
    ).toBe(true);
  });

  it('un subtotal resincroniza el acumulado con el valor del backend', () => {
    const [entrada, salida] = cascada({
      ventas: 100.004,
      costo: -0.002,
      gastos: 0,
      otros: 0,
      impuestos: 0,
    });
    const filas: FilaCascada[] = [
      entrada,
      salida,
      { clave: 'utilidad_bruta', etiqueta: 'Bruta', valor: 100, tipo: 'subtotal' },
      { clave: 'otros_netos', etiqueta: 'Otros', valor: 5, tipo: 'entrada' },
    ].filter((f): f is FilaCascada => f !== undefined);

    expect(tramos(filas).at(-1)).toEqual([100, 105]);
  });
});

describe('variacionPorcentual', () => {
  it('sin base no hay contra qué comparar', () => {
    expect(variacionPorcentual(100, 0)).toBeNull();
  });

  it('sube y baja sobre la base', () => {
    expect(variacionPorcentual(120, 100)).toBeCloseTo(20);
    expect(variacionPorcentual(80, 100)).toBeCloseTo(-20);
  });

  it('salir de una pérdida es mejorar aunque las dos cifras sean negativas', () => {
    expect(variacionPorcentual(-50, -100)).toBeCloseTo(50);
  });
});
