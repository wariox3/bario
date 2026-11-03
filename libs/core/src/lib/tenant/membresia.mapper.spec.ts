import type { MembresiaContenedor } from './contenedor.model';
import { membresiaToAccess } from './membresia.mapper';

const MEMBRESIA: MembresiaContenedor = {
  id: 5,
  usuario_id: 15,
  usuario_nombre_corto: 'Ana',
  usuario_email: 'ana@acme.co',
  cliente_id: 8,
  propietario: true,
  soporte: false,
  is_superuser: false,
  grupos: [1, 7],
  cliente_nombre: 'Acme',
  cliente_imagen_thumbnail: 'https://cdn/acme.webp',
};

describe('membresiaToAccess', () => {
  it('toma el schema consultado y copia lo que decide el acceso', () => {
    expect(membresiaToAccess('acme', MEMBRESIA)).toEqual({
      schema_name: 'acme',
      cliente_id: 8,
      propietario: true,
      soporte: false,
      is_superuser: false,
      grupos: [1, 7],
      cliente_nombre: 'Acme',
      cliente_imagen_thumbnail: 'https://cdn/acme.webp',
    });
  });

  it('propietario ausente se lee como false', () => {
    const { propietario: _omitido, ...sinPropietario } = MEMBRESIA;
    expect(membresiaToAccess('acme', sinPropietario).propietario).toBe(false);
  });

  it('sin nombre ni imagen deja null, para que el header use el slug y la inicial', () => {
    const { cliente_nombre: _n, cliente_imagen_thumbnail: _i, ...sinMarca } = MEMBRESIA;
    const access = membresiaToAccess('acme', sinMarca);
    expect(access.cliente_nombre).toBeNull();
    expect(access.cliente_imagen_thumbnail).toBeNull();
  });
});
