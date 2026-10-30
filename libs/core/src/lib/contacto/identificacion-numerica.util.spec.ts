import { FormControl } from '@angular/forms';
import {
  esIdentificacionNumerica,
  soloDigitosSegunIdentificacionValidator,
} from './identificacion-numerica.util';

describe('esIdentificacionNumerica', () => {
  it.each([
    ['11', true], // registro civil
    ['12', true], // tarjeta de identidad
    ['13', true], // cédula de ciudadanía
    ['31', true], // NIT
    ['21', false], // tarjeta de extranjería
    ['22', false], // cédula de extranjería
    ['41', false], // pasaporte
    ['42', false], // documento extranjero
    ['50', false], // NIT de otro país
  ])('código %s → %s', (codigo, numerica) => {
    expect(esIdentificacionNumerica({ id: 1, nombre: '', codigo })).toBe(numerica);
  });

  it('sin código deja escribir letras', () => {
    expect(esIdentificacionNumerica({ id: 1, nombre: 'Cédula de ciudadanía' })).toBe(false);
    expect(esIdentificacionNumerica(null)).toBe(false);
  });
});

describe('soloDigitosSegunIdentificacionValidator', () => {
  const validar = (valor: string, numerica: boolean) =>
    soloDigitosSegunIdentificacionValidator(() => numerica)(new FormControl(valor));

  it('en un tipo numérico rechaza lo que no sea dígito', () => {
    expect(validar('1.020.345', true)).toEqual({ soloDigitos: true });
    expect(validar('1020345', true)).toBeNull();
  });

  it('en un tipo alfanumérico deja pasar letras', () => {
    expect(validar('AB123456', false)).toBeNull();
  });

  it('vacío no es asunto suyo (para eso está required)', () => {
    expect(validar('', true)).toBeNull();
  });
});
