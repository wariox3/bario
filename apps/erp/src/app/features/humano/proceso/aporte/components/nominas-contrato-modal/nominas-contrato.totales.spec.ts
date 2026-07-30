import { sumar, totalesDe } from './nominas-contrato.totales';

interface Fila {
  devengado: number | string | null;
  deduccion: number | string | null;
}

const FILAS: Fila[] = [
  { devengado: 1000, deduccion: 100 },
  { devengado: '2500.50', deduccion: null },
  { devengado: null, deduccion: 50 },
];

describe('sumar', () => {
  it('sin filas suma cero', () => {
    expect(sumar([], 'devengado' as never)).toBe(0);
  });

  it('suma números y strings decimales por igual', () => {
    expect(sumar(FILAS, 'devengado')).toBe(3500.5);
  });

  it('cuenta como cero lo nulo o no numérico', () => {
    // Un solo valor basura no puede convertir el total en NaN.
    expect(sumar(FILAS, 'deduccion')).toBe(150);
    expect(sumar([{ devengado: 'x', deduccion: 10 }], 'devengado')).toBe(0);
  });
});

describe('totalesDe', () => {
  it('devuelve un total por cada campo pedido', () => {
    expect(totalesDe(FILAS, ['devengado', 'deduccion'])).toEqual({
      devengado: 3500.5,
      deduccion: 150,
    });
  });

  it('sin campos devuelve el mapa vacío', () => {
    expect(totalesDe(FILAS, [])).toEqual({});
  });
});
