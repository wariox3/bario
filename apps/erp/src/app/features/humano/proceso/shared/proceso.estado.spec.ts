import { estadoDe, type ContextoProceso } from './proceso.estado';

const BORRADOR: ContextoProceso = { estado_generado: false, estado_aprobado: false };
const GENERADA: ContextoProceso = { estado_generado: true, estado_aprobado: false };
const APROBADA: ContextoProceso = { estado_generado: true, estado_aprobado: true };

describe('estadoDe', () => {
  it('sin banderas es borrador', () => {
    expect(estadoDe(BORRADOR)).toBe('borrador');
  });

  it('generada sin aprobar es generada', () => {
    expect(estadoDe(GENERADA)).toBe('generada');
  });

  it('aprobada es aprobada', () => {
    expect(estadoDe(APROBADA)).toBe('aprobada');
  });

  it('aprobada sin generar (combinación imposible) se trata como aprobada', () => {
    // Conservador: ante datos incoherentes bloquea más, no menos.
    expect(estadoDe({ estado_generado: false, estado_aprobado: true })).toBe('aprobada');
  });
});
