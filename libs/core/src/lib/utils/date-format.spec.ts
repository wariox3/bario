import { FORMATO_FECHA, formatFechaCorta, formatFechaLarga } from './date.utils';

describe('FORMATO_FECHA', () => {
  // Las tres notaciones describen el MISMO formato. Si alguien cambia una sola,
  // la mitad de la app queda en el formato viejo y nadie lo nota hasta produccion.
  it('mantiene el día antes del mes en las tres notaciones', () => {
    expect(FORMATO_FECHA.primeng).toBe('dd/mm/yy');
    expect(FORMATO_FECHA.angular).toBe('dd/MM/y');
    expect(FORMATO_FECHA.angularConHora.startsWith(FORMATO_FECHA.angular)).toBe(true);
  });
});

describe('formatFechaCorta', () => {
  it('formatea un ISO sin hora como dd/MM/yyyy', () => {
    expect(formatFechaCorta('2026-08-05')).toBe('05/08/2026');
  });

  // El cero a la izquierda es lo que alinea una columna de fechas al escanearla;
  // el `mediumDate` del locale es-CO no lo pone (`5/08/2026`).
  it('rellena el día y el mes con cero', () => {
    expect(formatFechaCorta('2026-01-09')).toBe('09/01/2026');
  });

  // `new Date('2026-08-05')` se interpreta como UTC: al oeste de Greenwich
  // —Colombia— eso retrocede la fecha un día.
  it('no corre el día por zona horaria', () => {
    expect(formatFechaCorta('2026-01-01')).toBe('01/01/2026');
    expect(formatFechaCorta('2026-12-31')).toBe('31/12/2026');
  });

  it('acepta Date y epoch además del ISO', () => {
    expect(formatFechaCorta(new Date(2026, 7, 5))).toBe('05/08/2026');
    expect(formatFechaCorta(new Date(2026, 7, 5).getTime())).toBe('05/08/2026');
  });

  it('devuelve el fallback cuando no hay fecha o no es válida', () => {
    expect(formatFechaCorta(null)).toBe('');
    expect(formatFechaCorta(undefined)).toBe('');
    expect(formatFechaCorta('')).toBe('');
    expect(formatFechaCorta('no es una fecha', '—')).toBe('—');
    expect(formatFechaCorta(new Date('x'), '—')).toBe('—');
  });
});

describe('formatFechaLarga', () => {
  it('escribe el mes en palabras', () => {
    expect(formatFechaLarga('2026-08-05')).toBe('05 de agosto de 2026');
  });

  it('respeta el locale que le pasen', () => {
    expect(formatFechaLarga('2026-08-05', '—', 'en-US')).toBe('August 05, 2026');
  });

  it('devuelve el fallback cuando no hay fecha', () => {
    expect(formatFechaLarga(null, '—')).toBe('—');
  });
});
