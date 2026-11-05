import { CajaSinSedeError, cajaFormToPayload, cajaToFormValue } from './caja.mapper';
import type { Caja } from './caja.model';

const caja: Caja = {
  id: 1,
  nombre: 'Caja 1',
  placa: null,
  ubicacion: 'Primer piso, entrada',
  tipo: null,
  estado_activo: true,
  sede: 3,
  sede_nombre: 'Principal',
};

describe('caja.mapper', () => {
  it('rehidrata la sede con su nombre y deja vacío lo que llega en null', () => {
    expect(cajaToFormValue(caja)).toEqual({
      nombre: 'Caja 1',
      sede: { id: 3, nombre: 'Principal' },
      placa: '',
      tipo: '',
      ubicacion: 'Primer piso, entrada',
      estado_activo: true,
    });
  });

  it('manda la sede como id y el texto vacío como null', () => {
    expect(
      cajaFormToPayload({
        nombre: '  Caja 2 ',
        sede: { id: 3, nombre: 'Principal' },
        placa: '   ',
        tipo: 'Registradora',
        ubicacion: '',
        estado_activo: false,
      }),
    ).toEqual({
      nombre: 'Caja 2',
      sede: 3,
      placa: null,
      tipo: 'Registradora',
      ubicacion: null,
      estado_activo: false,
    });
  });

  it('sin sede no arma el payload', () => {
    expect(() => cajaFormToPayload({ ...cajaToFormValue(caja), sede: null })).toThrow(
      CajaSinSedeError,
    );
  });
});
