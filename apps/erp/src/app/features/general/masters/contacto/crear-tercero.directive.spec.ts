import { rolDesdeFiltro } from './crear-tercero.directive';

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
});
