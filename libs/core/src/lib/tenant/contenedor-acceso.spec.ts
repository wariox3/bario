import { accesosDisponibles, buildAccesoFlags, readModuleAccessFlags } from './contenedor-acceso';

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

describe('accesosDisponibles', () => {
  it('ofrece solo los módulos del plan del contenedor', () => {
    expect(accesosDisponibles(CONTENEDOR).map((a) => a.id)).toEqual([
      'venta',
      'compra',
      'cartera',
      'humano',
      'contabilidad',
    ]);
  });

  it('sin flags ofrece el catálogo completo, no una lista vacía', () => {
    expect(accesosDisponibles(null).length).toBeGreaterThan(0);
  });
});

describe('buildAccesoFlags', () => {
  it('manda el booleano explícito de cada acceso ofrecido, marcado o no', () => {
    expect(buildAccesoFlags(CONTENEDOR, ['venta', 'humano'])).toEqual({
      acceso_venta: true,
      acceso_compra: false,
      acceso_cartera: false,
      acceso_humano: true,
      acceso_contabilidad: false,
    });
  });

  it('no manda los accesos fuera del plan aunque se los pida', () => {
    expect(buildAccesoFlags(CONTENEDOR, ['inventario'])).not.toHaveProperty('acceso_inventario');
  });
});
