import { GRUPO_ACCESO, administraContenedor, readModuleAccessFlags } from './contenedor-acceso';

const MIEMBRO = { propietario: false, administrador: false, soporte: false } as const;

describe('readModuleAccessFlags', () => {
  it('cada grupo del catálogo habilita su módulo y los demás grupos se ignoran', () => {
    const flags = readModuleAccessFlags({ ...MIEMBRO, grupos: [1, 7, 42] });
    expect(flags).toEqual(new Set(['acceso_venta', 'acceso_contabilidad']));
  });

  it('el catálogo cubre los 8 accesos, uno por grupo', () => {
    const flags = readModuleAccessFlags({ ...MIEMBRO, grupos: [...GRUPO_ACCESO.keys()] });
    expect(flags?.size).toBe(8);
  });

  it('sin grupos no habilita ningún módulo (Set vacío, no null)', () => {
    expect(readModuleAccessFlags({ ...MIEMBRO, grupos: [] })).toEqual(new Set());
  });

  it.each(['propietario', 'administrador', 'soporte'] as const)(
    '%s entra a todo aunque no tenga grupos',
    (bandera) => {
      expect(readModuleAccessFlags({ ...MIEMBRO, grupos: [], [bandera]: true })).toBeNull();
    },
  );

  it('sin contenedor en memoria no restringe', () => {
    expect(readModuleAccessFlags(null)).toBeNull();
  });
});

describe('administraContenedor', () => {
  it('propietario y administrador administran', () => {
    expect(administraContenedor({ propietario: true, administrador: false })).toBe(true);
    expect(administraContenedor({ propietario: false, administrador: true })).toBe(true);
  });

  it('un miembro, sin banderas o sin contenedor no administra', () => {
    expect(administraContenedor({ propietario: false, administrador: false })).toBe(false);
    expect(administraContenedor({ propietario: false })).toBe(false);
    expect(administraContenedor(null)).toBe(false);
  });
});
