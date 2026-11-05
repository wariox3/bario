import { cuadreDe, duracion, formatDiferencia, formatFechaHora, formatPesos } from './turno.format';

describe('turno.format', () => {
  it('fecha y hora del turno, vacío sin fecha', () => {
    const iso = new Date(2026, 10, 5, 8, 7).toISOString();
    expect(formatFechaHora(iso)).toBe('05/11/2026 08:07');
    expect(formatFechaHora(null)).toBe('');
  });

  it('la base en pesos, desde el decimal en string del backend', () => {
    expect(formatPesos('200000.000000').replace(/\s/g, ' ')).toBe('$ 200.000');
  });

  it('el tiempo corrido en minutos, horas o días', () => {
    const desde = new Date(2026, 10, 5, 8, 0).toISOString();
    const t0 = new Date(desde).getTime();
    expect(duracion(desde, t0 + 45 * 60_000)).toBe('45 min');
    expect(duracion(desde, t0 + (3 * 60 + 24) * 60_000)).toBe('3 h 24 min');
    expect(duracion(desde, t0 + (26 * 60 + 5) * 60_000)).toBe('1 d 2 h');
    expect(duracion(desde, t0 - 60_000)).toBe('0 min');
  });

  it('la diferencia del arqueo lleva signo', () => {
    const limpio = (v: string) => v.replace(/\s/g, ' ');
    expect(limpio(formatDiferencia(-2000))).toBe('−$ 2.000');
    expect(limpio(formatDiferencia('3500.000000'))).toBe('+$ 3.500');
    expect(limpio(formatDiferencia(0))).toBe('$ 0');
  });

  it('el cuadre sale del signo de la diferencia', () => {
    expect(cuadreDe(0)).toBe('cuadra');
    expect(cuadreDe(-1)).toBe('falta');
    expect(cuadreDe(0.5)).toBe('sobra');
  });
});
