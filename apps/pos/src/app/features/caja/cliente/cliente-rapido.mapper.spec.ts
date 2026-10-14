import { TIPO_PERSONA } from '@reddoc/core';
import { clienteCreadoToOpcion, clienteRapidoToPayload } from './cliente-rapido.mapper';
import type { ClienteRapidoValores } from './cliente-rapido.model';

const base: ClienteRapidoValores = {
  tipo_persona: { id: TIPO_PERSONA.NATURAL, nombre: 'Natural' },
  identificacion: { id: 3, nombre: 'Cédula' },
  numero_identificacion: ' 1020304050 ',
  nombre_corto: 'No va',
  nombre1: 'Ana',
  nombre2: '',
  apellido1: 'Pérez',
  apellido2: ' Gómez ',
  correo: 'ana@correo.co',
  telefono: '3001234567',
  direccion: 'Calle 1',
  ciudad: { id: 11, nombre: 'Medellín' },
};

describe('clienteRapidoToPayload', () => {
  it('persona natural: nombre corto con nombres y apellidos, sin vacíos', () => {
    const p = clienteRapidoToPayload(base);
    expect(p.nombre_corto).toBe('Ana Pérez Gómez');
    expect(p.nombre2).toBeNull();
    expect(p.apellido2).toBe('Gómez');
    expect(p.numero_identificacion).toBe('1020304050');
    expect(p.cliente).toBe(true);
    expect(p.ciudad).toBe(11);
  });

  it('persona jurídica: razón social y sin nombres', () => {
    const p = clienteRapidoToPayload({
      ...base,
      tipo_persona: { id: TIPO_PERSONA.JURIDICA, nombre: 'Jurídica' },
      nombre_corto: ' Tienda SAS ',
    });
    expect(p.nombre_corto).toBe('Tienda SAS');
    expect(p.nombre1).toBeNull();
    expect(p.apellido1).toBeNull();
  });

  it('calcula el dígito de verificación', () => {
    expect(
      clienteRapidoToPayload({ ...base, numero_identificacion: '900123456' }).digito_verificacion,
    ).toBe('8');
  });
});

describe('clienteCreadoToOpcion', () => {
  it('etiqueta como el autocomplete: identificación - nombre', () => {
    expect(
      clienteCreadoToOpcion({ id: 5, nombre_corto: 'Ana Pérez', numero_identificacion: '1020' }),
    ).toEqual({ id: 5, nombre: '1020 - Ana Pérez' });
  });
});
