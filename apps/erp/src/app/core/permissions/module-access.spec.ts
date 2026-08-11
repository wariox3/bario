import { ERP_MODULES } from '@erp/core/erp-modules';
import { readModuleAccessFlags } from './module-access';

/** Contenedor tal como llega de `/contenedor/cliente/lista-usuario/`. */
const CONTENEDOR = {
  cliente_id: 13,
  schema_name: 'seguridad',
  nombre: 'Seguridad',
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
});

describe('accessFlag de los descriptores', () => {
  // Un typo acá (`acceso_ventas`) escondería el módulo para siempre sin error:
  // la flag no coincide, el filtro lo saca y nadie se entera.
  it('coincide con las flags que manda el backend', () => {
    // Todas en `true`: acá interesa que la flag exista, no si está concedida.
    const todasConcedidas = Object.fromEntries(
      Object.keys(CONTENEDOR)
        .filter((key) => key.startsWith('acceso_'))
        .map((key) => [key, true]),
    );
    const delBackend = readModuleAccessFlags(todasConcedidas);
    const declaradas = ERP_MODULES.map((m) => m.accessFlag).filter(
      (flag): flag is string => flag !== undefined,
    );

    expect(declaradas.length).toBeGreaterThan(0);
    for (const flag of declaradas) {
      expect(delBackend?.has(flag)).toBe(true);
    }
  });

  it('General no declara flag: es la base, no se contrata aparte', () => {
    expect(ERP_MODULES.find((m) => m.id === 'general')?.accessFlag).toBeUndefined();
  });
});
