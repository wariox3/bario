import { numero } from './editar-renglon-modal.component';

describe('numero (decimales del renglón)', () => {
  it('convierte el string decimal que manda el backend', () => {
    expect(numero('109.995')).toBe(109.995);
    expect(numero('1750905.000000')).toBe(1750905);
  });

  it('deja pasar un número tal cual', () => {
    expect(numero(15)).toBe(15);
  });

  it('vacío o inválido es 0', () => {
    expect(numero(null)).toBe(0);
    expect(numero(undefined)).toBe(0);
    expect(numero('abc')).toBe(0);
  });
});
