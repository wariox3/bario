import { readModuleAccessFlags } from './contenedor-acceso';

/** Contenedor tal como llega de `/contenedor/cliente/lista-usuario/`. */
const CONTENEDOR = {
  id: 21,
  cliente_id: 13,
  schema_name: 'seguridad',
  cliente_nombre: 'Seguridad',
  activo: true,
  propietario: true,
  acceso_venta: true,
  acceso_compra: true,
  acceso_tesoreria: false,
  acceso_cartera: true,
  acceso_inventario: false,
  acceso_humano: true,
  acceso_contabilidad: true,
};

describe('readModuleAccessFlags', () => {
  it('devuelve solo las flags en true', () => {
    expect(readModuleAccessFlags(CONTENEDOR)).toEqual(
      new Set([
        'acceso_venta',
        'acceso_compra',
        'acceso_cartera',
        'acceso_humano',
        'acceso_contabilidad',
      ]),
    );
  });

  it('sin ninguna flag no restringe (null), para no vaciar el topbar', () => {
    expect(readModuleAccessFlags({ cliente_id: 13, propietario: true })).toBeNull();
    expect(readModuleAccessFlags(null)).toBeNull();
  });

  it('con las flags presentes pero todas en false, restringe de verdad', () => {
    expect(readModuleAccessFlags({ acceso_venta: false })).toEqual(new Set());
  });

  it('ignora valores que no sean el booleano true', () => {
    expect(readModuleAccessFlags({ acceso_venta: 'true', acceso_compra: 1 })).toEqual(new Set());
  });

  describe('por grupos de la membresía', () => {
    const MIEMBRO = { schema_name: 'acme', cliente_id: 8, propietario: false, soporte: false };

    it('cada grupo del catálogo habilita su módulo y los demás grupos se ignoran', () => {
      const flags = readModuleAccessFlags({ ...MIEMBRO, grupos: [1, 7, 42] });
      expect(flags).toEqual(new Set(['acceso_venta', 'acceso_contabilidad']));
    });

    it('sin grupos no habilita ningún módulo (Set vacío, no null)', () => {
      expect(readModuleAccessFlags({ ...MIEMBRO, grupos: [] })).toEqual(new Set());
    });

    it('los grupos mandan sobre flags acceso_* que hubieran quedado', () => {
      const flags = readModuleAccessFlags({ ...MIEMBRO, grupos: [2], acceso_venta: true });
      expect(flags).toEqual(new Set(['acceso_compra']));
    });

    it.each([['propietario'], ['is_superuser'], ['soporte']])(
      '%s entra a todo aunque no tenga grupos',
      (bandera) => {
        expect(readModuleAccessFlags({ ...MIEMBRO, grupos: [], [bandera]: true })).toBeNull();
      },
    );
  });
});
