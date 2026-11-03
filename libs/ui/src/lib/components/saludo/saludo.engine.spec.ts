import { saludoEn, saludoEs } from './i18n';
import { FRASES_GENERALES, FRASES_POR_DIA, FRASES_POR_FRANJA } from './saludo.catalogo';
import {
  claveDelMomento,
  diaConFrases,
  elegirSaludo,
  fechaConDia,
  franjaDelDia,
  primerNombre,
} from './saludo.engine';

/** Viernes 30 de octubre de 2026 a la hora indicada. */
const viernes = (hora: number, minuto = 0) => new Date(2026, 9, 30, hora, minuto);

describe('franjaDelDia', () => {
  it.each([
    [0, 'madrugada'],
    [4, 'madrugada'],
    [5, 'temprano'],
    [7, 'temprano'],
    [8, 'manana'],
    [11, 'manana'],
    [12, 'mediodia'],
    [13, 'mediodia'],
    [14, 'tarde'],
    [18, 'tarde'],
    [19, 'noche'],
    [23, 'noche'],
  ])('a las %i es %s', (hora, franja) => {
    expect(franjaDelDia(viernes(hora))).toBe(franja);
  });
});

describe('diaConFrases', () => {
  it('reconoce lunes, viernes y fin de semana', () => {
    expect(diaConFrases(new Date(2026, 9, 26))).toBe('lunes');
    expect(diaConFrases(new Date(2026, 9, 30))).toBe('viernes');
    expect(diaConFrases(new Date(2026, 9, 31))).toBe('finDeSemana');
    expect(diaConFrases(new Date(2026, 10, 1))).toBe('finDeSemana');
  });

  it('los demás días no tienen frases propias', () => {
    expect(diaConFrases(new Date(2026, 9, 28))).toBeNull();
  });
});

describe('primerNombre', () => {
  it('toma solo el primer nombre', () => {
    expect(primerNombre('  Mario Pérez Gómez ')).toBe('Mario');
  });

  it('sin nombre devuelve vacío', () => {
    expect(primerNombre(null)).toBe('');
    expect(primerNombre(undefined)).toBe('');
  });
});

describe('fechaConDia', () => {
  it('pinta el día con mayúscula inicial y sin año', () => {
    expect(fechaConDia(viernes(9), 'es-CO')).toBe('Viernes, 30 de octubre');
  });
});

describe('claveDelMomento', () => {
  it('no cambia dentro de la misma franja', () => {
    expect(claveDelMomento(viernes(14, 5), 'Mario')).toBe(
      claveDelMomento(viernes(18, 59), 'Mario'),
    );
  });

  it('cambia al pasar de franja', () => {
    expect(claveDelMomento(viernes(18, 59), 'Mario')).not.toBe(
      claveDelMomento(viernes(19), 'Mario'),
    );
  });
});

describe('elegirSaludo', () => {
  it('la misma clave elige lo mismo', () => {
    const clave = claveDelMomento(viernes(9), 'Mario');
    expect(elegirSaludo(viernes(9), clave)).toEqual(elegirSaludo(viernes(9, 40), clave));
  });

  it('solo elige frases que caben en el momento', () => {
    const lunesNoche = new Date(2026, 9, 26, 21);
    const validas = new Set<string>([
      ...FRASES_POR_FRANJA.noche,
      ...FRASES_POR_DIA.lunes,
      ...FRASES_GENERALES,
    ]);
    for (let i = 0; i < 200; i++) {
      const { frase } = elegirSaludo(lunesNoche, `semilla-${i}`);
      expect(validas.has(frase)).toBe(true);
    }
  });

  it('un martes no usa frases de día', () => {
    const martes = new Date(2026, 9, 27, 10);
    const deDia = new Set<string>(Object.values(FRASES_POR_DIA).flat());
    for (let i = 0; i < 200; i++) {
      expect(deDia.has(elegirSaludo(martes, `semilla-${i}`).frase)).toBe(false);
    }
  });

  it('evita la frase de la vez anterior', () => {
    for (let i = 0; i < 200; i++) {
      const clave = `semilla-${i}`;
      const { frase } = elegirSaludo(viernes(9), clave);
      expect(elegirSaludo(viernes(9), clave, frase).frase).not.toBe(frase);
    }
  });

  it('sale cada frase de la franja alguna vez', () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 2000; i++) vistas.add(elegirSaludo(viernes(9), `semilla-${i}`).frase);
    for (const id of FRASES_POR_FRANJA.manana) expect(vistas.has(id)).toBe(true);
  });
});

describe('catálogo', () => {
  it('solo va en mayúscula la primera palabra de cada oración', () => {
    for (const texto of Object.values(saludoEs.frases)) {
      for (const oracion of texto.split(/[?!.]\s+/)) {
        const resto = oracion.replace(/^[¿¡]?\S+/, '');
        expect(resto).toBe(resto.toLowerCase());
      }
    }
  });

  it('es y en traducen los mismos ids', () => {
    expect(Object.keys(saludoEn.frases).sort()).toEqual(Object.keys(saludoEs.frases).sort());
    expect(Object.keys(saludoEn.saludos).sort()).toEqual(Object.keys(saludoEs.saludos).sort());
  });
});
