import { readModuleAccessFlags } from '@reddoc/core';
import { ERP_MODULES } from './erp-modules.registry';

describe('accessFlag de los descriptores', () => {
  // Un typo acá (`acceso_ventas`) escondería el módulo para siempre sin error:
  // la flag no coincide, el filtro lo saca y nadie se entera.
  it('coincide con las flags que manda el backend', () => {
    // Todas en `true`: acá interesa que la flag exista, no si está concedida.
    const todasConcedidas = Object.fromEntries(
      [
        'acceso_venta',
        'acceso_compra',
        'acceso_tesoreria',
        'acceso_cartera',
        'acceso_inventario',
        'acceso_humano',
        'acceso_contabilidad',
      ].map((key) => [key, true]),
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
