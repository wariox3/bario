import { rutaSinTenant } from './ruta-sin-tenant';

describe('rutaSinTenant', () => {
  it('quita el prefijo del tenant', () => {
    expect(rutaSinTenant('/t/lumber/venta/factura-venta/list')).toBe('/venta/factura-venta/list');
  });

  it('acepta slugs con guiones y números', () => {
    expect(rutaSinTenant('/t/mi-empresa-2/venta/factura-venta/detalle/123')).toBe(
      '/venta/factura-venta/detalle/123',
    );
  });

  it('conserva la barra final', () => {
    expect(rutaSinTenant('/t/lumber/inventario/')).toBe('/inventario/');
  });

  it('deja la raíz del tenant en /', () => {
    expect(rutaSinTenant('/t/lumber')).toBe('/');
    expect(rutaSinTenant('/t/lumber/')).toBe('/');
  });

  it('devuelve igual una ruta sin tenant', () => {
    expect(rutaSinTenant('/dashboard')).toBe('/dashboard');
    expect(rutaSinTenant('/contenedores/t/x')).toBe('/contenedores/t/x');
  });
});
