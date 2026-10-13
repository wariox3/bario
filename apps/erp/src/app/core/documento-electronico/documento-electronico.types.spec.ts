import { clasificarEmision } from './documento-electronico.types';

describe('clasificarEmision', () => {
  it('es éxito cuando ninguno quedó con error', () => {
    expect(clasificarEmision({ emitidos: [1, 2], con_error: [] })).toBe('exito');
  });

  it('es parcial cuando unos se emitieron y otros no', () => {
    expect(clasificarEmision({ emitidos: [1], con_error: [2] })).toBe('parcial');
  });

  it('es fallo cuando ninguno se emitió', () => {
    expect(clasificarEmision({ emitidos: [], con_error: [2, 1] })).toBe('fallo');
  });
});
