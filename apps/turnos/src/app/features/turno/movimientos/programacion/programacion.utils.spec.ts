import type { ProgramacionVigencia } from './programacion.model';
import {
  clavesEnVigencia,
  esColumnaFestiva,
  esColumnaSabado,
  estaEnVigencia,
  formatVigenciaRango,
  localeDe,
  toProgramacionFecha,
  vigenciaDe,
} from './programacion.utils';

// Suite plantilla del módulo: solo funciones puras (sin TestBed/DOM/HTTP). Es el
// molde para el resto de specs — casos borde de las reglas que de verdad se rompen.

describe('esColumnaFestiva', () => {
  it('marca festivo el domingo aunque el día no venga en el set', () => {
    expect(esColumnaFestiva('D', false)).toBe(true);
  });

  it('marca festivo cualquier día cuyo flag `esFestivoDia` es true', () => {
    expect(esColumnaFestiva('L', true)).toBe(true);
  });

  it('no marca festivo un día laboral sin flag', () => {
    expect(esColumnaFestiva('L', false)).toBe(false);
  });
});

describe('esColumnaSabado', () => {
  it('marca sábado cuando NO es además festivo', () => {
    expect(esColumnaSabado('S', false)).toBe(true);
  });

  // Regresión: un sábado que también es festivo NO se raya como sábado (lo gana
  // el resaltado de festivo). Antes el modal de prototipo omitía esta exclusión.
  it('NO marca sábado si el día es además festivo', () => {
    expect(esColumnaSabado('S', true)).toBe(false);
  });

  it('no marca sábado a un día que no es sábado', () => {
    expect(esColumnaSabado('L', false)).toBe(false);
  });
});

describe('estaEnVigencia', () => {
  const vigencia: ProgramacionVigencia = { desde: '2026-07-01', hasta: '2026-07-31' };

  it('sin vigencia (null) todo día es válido', () => {
    expect(estaEnVigencia('2026-07-15', null)).toBe(true);
  });

  it('incluye los extremos (desde y hasta inclusive)', () => {
    expect(estaEnVigencia('2026-07-01', vigencia)).toBe(true);
    expect(estaEnVigencia('2026-07-31', vigencia)).toBe(true);
  });

  it('excluye un día antes de `desde` y uno después de `hasta`', () => {
    expect(estaEnVigencia('2026-06-30', vigencia)).toBe(false);
    expect(estaEnVigencia('2026-08-01', vigencia)).toBe(false);
  });

  it('acepta un día interior del rango', () => {
    expect(estaEnVigencia('2026-07-09', vigencia)).toBe(true);
  });
});

describe('clavesEnVigencia', () => {
  const claves = ['2026-06-30', '2026-07-01', '2026-07-15', '2026-08-01'];

  it('devuelve solo las claves dentro de la vigencia', () => {
    const set = clavesEnVigencia(claves, { desde: '2026-07-01', hasta: '2026-07-31' });
    expect([...set]).toEqual(['2026-07-01', '2026-07-15']);
  });

  it('sin vigencia devuelve todas las claves', () => {
    const set = clavesEnVigencia(claves, null);
    expect(set.size).toBe(claves.length);
  });
});

describe('vigenciaDe', () => {
  it('arma el rango solo con ambos extremos', () => {
    expect(vigenciaDe('2026-07-01', '2026-07-31')).toEqual({
      desde: '2026-07-01',
      hasta: '2026-07-31',
    });
  });

  it('devuelve null si falta un extremo o son null/undefined', () => {
    expect(vigenciaDe('2026-07-01', null)).toBeNull();
    expect(vigenciaDe(null, '2026-07-31')).toBeNull();
    expect(vigenciaDe(undefined, undefined)).toBeNull();
  });
});

describe('toProgramacionFecha', () => {
  it('conserva el ISO como clave y expone el día sin cero a la izquierda', () => {
    expect(toProgramacionFecha('2026-07-05')).toMatchObject({ clave: '2026-07-05', etiqueta: '5' });
    expect(toProgramacionFecha('2026-07-15').etiqueta).toBe('15');
  });

  it('deriva la inicial del día de la semana (D..S)', () => {
    expect(toProgramacionFecha('2026-07-05').inicial).toBe('D'); // domingo
    expect(toProgramacionFecha('2026-07-11').inicial).toBe('S'); // sábado
    expect(toProgramacionFecha('2026-07-15').inicial).toBe('X'); // miércoles
  });
});

describe('localeDe', () => {
  it("mapea 'en' a en-US y cualquier otro a es-CO", () => {
    expect(localeDe('en')).toBe('en-US');
    expect(localeDe('es')).toBe('es-CO');
    expect(localeDe('')).toBe('es-CO');
  });
});

describe('formatVigenciaRango', () => {
  it('devuelve null sin vigencia o con extremos que no parsean', () => {
    expect(formatVigenciaRango(null, 'es-CO')).toBeNull();
    expect(formatVigenciaRango({ desde: 'no-es-fecha', hasta: 'tampoco' }, 'es-CO')).toBeNull();
  });

  // No se asertan los meses localizados (frágil según ICU): solo la forma del rango.
  it('formatea un rango válido con separador y ambos días', () => {
    const rango = formatVigenciaRango({ desde: '2026-07-15', hasta: '2026-07-31' }, 'es-CO');
    expect(rango).toContain(' - ');
    expect(rango).toContain('15');
    expect(rango).toContain('31');
  });
});
