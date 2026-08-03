import {
  esColumnaFestiva,
  esColumnaSabado,
  toProgramacionFecha,
} from './programacion-calendario.utils';

// Funciones puras del calendario de programación (sin TestBed/DOM/HTTP). Los casos
// vienen del spec de `apps/turnos`, que era su dueño antes de compartirse acá.

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
