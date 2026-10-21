import { rolDesdeFiltro, rolInicial } from './crear-tercero.directive';

describe('rolDesdeFiltro', () => {
  it('compra filtra proveedor', () => {
    expect(rolDesdeFiltro({ proveedor: 'True' })).toBe('proveedor');
  });

  it('venta filtra cliente', () => {
    expect(rolDesdeFiltro({ cliente: 'True' })).toBe('cliente');
  });

  it('sin filtro de rol no premarca nada', () => {
    expect(rolDesdeFiltro({})).toBeUndefined();
    expect(rolDesdeFiltro({ cliente: 'False' })).toBeUndefined();
  });

  it('acepta el booleano además del literal DRF', () => {
    expect(rolDesdeFiltro({ cliente: true })).toBe('cliente');
  });

  it('un filtro de empleados premarca empleado', () => {
    expect(rolDesdeFiltro({ empleado: 'True' })).toBe('empleado');
  });
});

describe('rolInicial', () => {
  it('el rol explícito del atributo manda sobre el filtro', () => {
    expect(rolInicial('empleado', { cliente: 'True' })).toBe('empleado');
  });

  it('sin rol explícito se deduce del filtro', () => {
    expect(rolInicial('', { proveedor: 'True' })).toBe('proveedor');
    expect(rolInicial('', {})).toBeUndefined();
  });
});
