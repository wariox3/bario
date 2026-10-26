import { agregarCorreo, esCorreoValido, partirCorreos, unirCorreos } from './correos.utils';

describe('partirCorreos', () => {
  it('parte por ; y descarta vacíos', () => {
    expect(partirCorreos('a@x.com; b@x.com;;')).toEqual(['a@x.com', 'b@x.com']);
  });

  // Un dato legado o una lista pegada puede venir con coma o espacios.
  it('acepta coma y espacios como separador', () => {
    expect(partirCorreos('a@x.com, b@x.com c@x.com')).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
  });

  it('devuelve [] para vacío o null', () => {
    expect(partirCorreos('')).toEqual([]);
    expect(partirCorreos(null)).toEqual([]);
  });
});

describe('unirCorreos', () => {
  it('une con ;', () => {
    expect(unirCorreos(['a@x.com', 'b@x.com'])).toBe('a@x.com;b@x.com');
  });
});

describe('esCorreoValido', () => {
  it('acepta un correo y rechaza texto suelto', () => {
    expect(esCorreoValido('a@x.com')).toBe(true);
    expect(esCorreoValido('NO')).toBe(false);
  });
});

describe('agregarCorreo', () => {
  it('suma al final de lo que había', () => {
    expect(agregarCorreo('a@x.com', 'b@x.com')).toBe('a@x.com;b@x.com');
  });

  it('no duplica, sin distinguir mayúsculas', () => {
    expect(agregarCorreo('a@x.com', 'A@X.com')).toBe('a@x.com');
  });

  it('ignora un correo inválido', () => {
    expect(agregarCorreo('a@x.com', 'NO')).toBe('a@x.com');
  });
});
