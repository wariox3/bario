import { contactoToSeleccionarOption } from './contacto.mapper';
import type { Contacto } from './contacto.model';

/** Solo los campos que lee el mapper; el resto del read no participa. */
const creado = {
  id: 7,
  numero_identificacion: '900123456',
  nombre_corto: 'Acme S.A.S.',
  plazo_pago: 3,
  plazo_pago_proveedor: 5,
  precio: 2,
} as Contacto;

describe('contactoToSeleccionarOption', () => {
  it('arma la etiqueta identificación - nombre, igual que el selector', () => {
    expect(contactoToSeleccionarOption(creado).nombre).toBe('900123456 - Acme S.A.S.');
  });

  // El contrato con `plazo-pago-contacto.ts` y `precioListaDeContacto`: un tercero
  // creado desde el documento autocompleta lo mismo que uno elegido de la lista.
  it('traduce los FK del POST a las claves de contacto/seleccionar/', () => {
    expect(contactoToSeleccionarOption(creado)).toMatchObject({
      id: 7,
      plazo_pago_id: 3,
      plazo_pago_proveedor_id: 5,
      precio_id: 2,
    });
  });

  it('conserva null cuando el contacto no tiene plazo ni lista', () => {
    const option = contactoToSeleccionarOption({
      ...creado,
      plazo_pago: null,
      plazo_pago_proveedor: null,
      precio: null,
    });
    expect(option['plazo_pago_id']).toBeNull();
    expect(option['plazo_pago_proveedor_id']).toBeNull();
    expect(option['precio_id']).toBeNull();
  });

  it('cae al nombre cuando no hay identificación', () => {
    expect(contactoToSeleccionarOption({ ...creado, numero_identificacion: '' }).nombre).toBe(
      'Acme S.A.S.',
    );
  });
});
