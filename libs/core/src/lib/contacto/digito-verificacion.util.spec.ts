import { calcularDigitoVerificacion } from './digito-verificacion.util';

describe('calcularDigitoVerificacion', () => {
  it.each([
    ['800197268', '4'], // DIAN
    ['890903938', '8'], // Bancolombia
    ['899999068', '1'], // Ecopetrol
    ['860034313', '7'], // Davivienda
  ])('NIT %s → DV %s', (nit, dv) => {
    expect(calcularDigitoVerificacion(nit)).toBe(dv);
  });

  it('residuo 0: el DV es 0', () => {
    expect(calcularDigitoVerificacion('900000009')).toBe('0');
  });

  it('residuo 1: el DV es 1, no 10', () => {
    expect(calcularDigitoVerificacion('900000002')).toBe('1');
  });

  it('ignora los espacios alrededor del número', () => {
    expect(calcularDigitoVerificacion('  800197268 ')).toBe('4');
  });

  it.each([
    ['vacío', ''],
    ['solo espacios', '   '],
    ['con puntos', '800.197.268'],
    ['con el DV pegado', '800197268-4'],
    ['pasaporte alfanumérico', 'AB123456'],
    ['más de 15 dígitos', '1234567890123456'],
  ])('%s → 0', (_caso, numero) => {
    expect(calcularDigitoVerificacion(numero)).toBe('0');
  });

  it('15 dígitos, el máximo de la tabla de pesos, todavía se calcula', () => {
    expect(calcularDigitoVerificacion('123456789012345')).toBe('2');
  });
});
