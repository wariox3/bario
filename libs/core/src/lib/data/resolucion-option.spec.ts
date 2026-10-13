import { resolucionDesdeRead, resolucionLabel, resolucionTexto } from './resolucion-option';

const READ = { resolucion: 1, resolucion_prefijo: 'SETP', resolucion_numero: '18760000001' };

describe('resolución de un documento leído', () => {
  it('arma la opción del selector con prefijo y número', () => {
    const opcion = resolucionDesdeRead(READ);
    expect(opcion).toEqual({ id: 1, nombre: '', prefijo: 'SETP', numero: '18760000001' });
    expect(opcion && resolucionLabel(opcion)).toBe('SETP 18760000001');
  });

  it('sin resolución no hay opción ni texto', () => {
    expect(resolucionDesdeRead({ resolucion: null })).toBeNull();
    expect(resolucionTexto({ resolucion: null })).toBe('');
  });

  it('pinta el texto de la ficha con prefijo y número', () => {
    expect(resolucionTexto(READ)).toBe('SETP 18760000001');
    expect(resolucionTexto({ ...READ, resolucion_prefijo: null })).toBe('18760000001');
  });
});
