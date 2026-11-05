import { cambio, sugerenciasEfectivo } from './efectivo';

describe('sugerenciasEfectivo', () => {
  it('redondea a billetes por encima del total, sin el exacto', () => {
    expect(sugerenciasEfectivo(47_600)).toEqual([50_000, 60_000, 100_000]);
  });

  it('un total ya redondo no se repite como sugerencia', () => {
    expect(sugerenciasEfectivo(50_000)).toEqual([60_000, 100_000]);
  });

  it('sin total no sugiere nada', () => {
    expect(sugerenciasEfectivo(0)).toEqual([]);
  });
});

describe('cambio', () => {
  it('devuelve la diferencia y nunca negativo', () => {
    expect(cambio(60_000, 47_600)).toBe(12_400);
    expect(cambio(20_000, 47_600)).toBe(0);
  });
});
