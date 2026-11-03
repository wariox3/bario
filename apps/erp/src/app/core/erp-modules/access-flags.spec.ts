import { GRUPO_ACCESO, readModuleAccessFlags } from '@reddoc/core';
import { ERP_MODULES } from './erp-modules.registry';

describe('accessFlag de los descriptores', () => {
  // El tipo ya impide un typo (`acceso_ventas`); esto cuida que cada flag
  // declarada tenga un grupo que la conceda, o el módulo quedaría cerrado para
  // todo el que no sea propietario.
  it('cada flag declarada la concede algún grupo de GRUPO_ACCESO', () => {
    const todosLosGrupos = readModuleAccessFlags({
      propietario: false,
      grupos: [...GRUPO_ACCESO.keys()],
    });
    const declaradas = ERP_MODULES.map((m) => m.accessFlag).filter((flag) => flag !== undefined);

    expect(declaradas.length).toBeGreaterThan(0);
    for (const flag of declaradas) {
      expect(todosLosGrupos?.has(flag)).toBe(true);
    }
  });

  it('General no declara flag: siempre disponible', () => {
    expect(ERP_MODULES.find((m) => m.id === 'general')?.accessFlag).toBeUndefined();
  });
});
