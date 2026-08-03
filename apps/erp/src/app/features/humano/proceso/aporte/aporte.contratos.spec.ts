import { conNovedad, novedadDe, type ContextoNovedad } from './aporte.contratos';
import type { AporteContrato } from './aporte.model';

const LIMPIO: ContextoNovedad = { ingreso: false, retiro: false, error_terminacion: false };

describe('novedadDe', () => {
  it('sin banderas no reporta novedad', () => {
    expect(novedadDe(LIMPIO)).toBe('ninguna');
  });

  it('distingue ingreso de retiro', () => {
    expect(novedadDe({ ...LIMPIO, ingreso: true })).toBe('ingreso');
    expect(novedadDe({ ...LIMPIO, retiro: true })).toBe('retiro');
  });

  it('reporta las dos cuando el contrato entró y salió en el mismo periodo', () => {
    expect(novedadDe({ ...LIMPIO, ingreso: true, retiro: true })).toBe('ingresoRetiro');
  });

  it('el error de terminación gana sobre ingreso y retiro', () => {
    // Es lo único que exige una corrección antes de generar: no puede quedar
    // tapado por una novedad informativa.
    expect(novedadDe({ ingreso: true, retiro: true, error_terminacion: true })).toBe('error');
    expect(novedadDe({ ...LIMPIO, error_terminacion: true })).toBe('error');
  });
});

describe('conNovedad', () => {
  it('agrega la novedad sin tocar el resto de la fila', () => {
    const contrato = {
      id: 7,
      contrato: 12,
      ingreso: true,
      retiro: false,
      error_terminacion: false,
    } as AporteContrato;

    const [fila] = conNovedad([contrato]);

    expect(fila.novedad).toBe('ingreso');
    expect(fila.id).toBe(7);
    expect(fila.contrato).toBe(12);
  });

  it('con la lista vacía devuelve vacío', () => {
    expect(conNovedad([])).toEqual([]);
  });
});
