import type { ContenedorMember } from '@reddoc/core';
import { rolDeMiembro } from './usuarios.utils';

const MIEMBRO: ContenedorMember = {
  id: 1,
  usuario_id: 10,
  usuario_nombre_corto: 'Ana',
  usuario_email: 'ana@acme.co',
  cliente_id: 3,
  propietario: false,
  administrador: false,
  soporte: false,
  grupos: [],
};

describe('rolDeMiembro', () => {
  it('sin banderas es miembro', () => {
    expect(rolDeMiembro(MIEMBRO)).toBe('miembro');
  });

  it('cada bandera da su rol', () => {
    expect(rolDeMiembro({ ...MIEMBRO, propietario: true })).toBe('propietario');
    expect(rolDeMiembro({ ...MIEMBRO, administrador: true })).toBe('administrador');
    expect(rolDeMiembro({ ...MIEMBRO, soporte: true })).toBe('soporte');
  });

  it('propietario gana aunque también venga como administrador', () => {
    expect(rolDeMiembro({ ...MIEMBRO, propietario: true, administrador: true })).toBe(
      'propietario',
    );
  });
});
