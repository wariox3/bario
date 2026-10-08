import { componerCelular, normalizarCelular, partirCelular } from './celular.utils';
import { PAISES_CELULAR } from './paises-celular';

const CO = PAISES_CELULAR.find((p) => p.iso === 'CO')!;

describe('partirCelular', () => {
  it('separa el indicativo de un E.164', () => {
    expect(partirCelular('+573153334455')).toEqual({
      pais: CO,
      nacional: '3153334455',
      enCatalogo: true,
    });
  });

  it('reconoce indicativos de tres dígitos', () => {
    const { pais, nacional } = partirCelular('+593991234567');
    expect(pais.iso).toBe('EC');
    expect(nacional).toBe('991234567');
  });

  // US, CA y DO comparten +1: gana el primero del catálogo. El número no se
  // altera, solo la bandera con que se muestra.
  it('atribuye el +1 compartido al primero del catálogo', () => {
    expect(partirCelular('+13051234567').pais.iso).toBe('US');
  });

  it('marca fuera de catálogo un indicativo desconocido y no lo recorta', () => {
    expect(partirCelular('+447911123456')).toEqual({
      pais: CO,
      nacional: '447911123456',
      enCatalogo: false,
    });
  });

  it('limpia separadores de un guardado legado', () => {
    expect(partirCelular('315 333-4455').nacional).toBe('3153334455');
  });

  // Los guardados sin normalizar quedaban con el indicativo pegado y sin `+`.
  // Sin separarlo, componer devolvería `+57573153334455`.
  it('separa el indicativo que venía pegado sin +', () => {
    expect(partirCelular('573153334455')).toEqual({
      pais: CO,
      nacional: '3153334455',
      enCatalogo: true,
    });
  });

  // La contracara: un nacional legítimo nunca debe recortarse, aunque empiece
  // con los mismos dígitos del indicativo.
  it('no recorta un nacional del largo correcto', () => {
    expect(partirCelular('5731533344').nacional).toBe('5731533344');
  });

  it('resuelve el vacío con el país por defecto', () => {
    expect(partirCelular('')).toEqual({ pais: CO, nacional: '', enCatalogo: true });
    expect(partirCelular(null).nacional).toBe('');
  });

  it('respeta el país por defecto que se le pase', () => {
    expect(partirCelular('600111222', 'ES').pais.iso).toBe('ES');
  });
});

describe('componerCelular', () => {
  it('arma el E.164', () => {
    expect(componerCelular(CO, '3153334455')).toBe('+573153334455');
  });

  it('devuelve vacío cuando no hay número nacional', () => {
    expect(componerCelular(CO, '')).toBe('');
  });
});

describe('normalizarCelular', () => {
  it('deja igual lo que ya está en E.164', () => {
    expect(normalizarCelular('+573153334455')).toBe('+573153334455');
  });

  it('completa el indicativo de un guardado legado', () => {
    expect(normalizarCelular('3153334455')).toBe('+573153334455');
    expect(normalizarCelular('315 333-4455')).toBe('+573153334455');
  });

  it('no duplica el indicativo que venía pegado sin +', () => {
    expect(normalizarCelular('573153334455')).toBe('+573153334455');
  });

  // Recomponerlo con el país por defecto reescribiría el número: se respeta.
  it('respeta un E.164 de un país fuera del catálogo', () => {
    expect(normalizarCelular('+447911123456')).toBe('+447911123456');
  });

  it('resuelve el vacío como cadena vacía', () => {
    expect(normalizarCelular('')).toBe('');
    expect(normalizarCelular(null)).toBe('');
    expect(normalizarCelular(undefined)).toBe('');
  });
});
