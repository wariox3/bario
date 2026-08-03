import type { ProgramacionVigencia } from './programacion.model';
import {
  clavesEnVigencia,
  estaEnVigencia,
  formatVigenciaRango,
  localeDe,
  vigenciaDe,
} from './programacion.utils';

// Suite plantilla del módulo: solo funciones puras (sin TestBed/DOM/HTTP). Es el
// molde para el resto de specs — casos borde de las reglas que de verdad se rompen.
// El resaltado de columna y `toProgramacionFecha` se probaron acá hasta que se
// compartieron: ahora viven en `libs/core/src/lib/calendario`, con su spec.

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
