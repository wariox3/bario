import { cambio, sugerenciasEfectivo } from './efectivo';

describe('sugerenciasEfectivo', () => {
  it('propone el exacto y los redondeos a billetes', () => {
    expect(sugerenciasEfectivo(23_400)).toEqual([23_400, 24_000, 25_000, 30_000]);
  });

  it('no repite cuando el total ya es redondo', () => {
    expect(sugerenciasEfectivo(50_000)).toEqual([50_000, 60_000, 100_000]);
  });

  it('sin total no sugiere nada', () => {
    expect(sugerenciasEfectivo(0)).toEqual([]);
  });
});

describe('cambio', () => {
  it('devuelve la diferencia y nunca negativo', () => {
    expect(cambio(30_000, 23_400)).toBe(6_600);
    expect(cambio(20_000, 23_400)).toBe(0);
  });
});
