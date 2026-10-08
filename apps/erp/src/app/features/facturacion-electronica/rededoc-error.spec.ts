import { HttpErrorResponse } from '@angular/common/http';
import { FormControl } from '@angular/forms';
import { parseRedEDocError, repartirErrores, tieneCodigo } from './rededoc-error';

function http400(body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status: 400, error: body });
}

describe('parseRedEDocError', () => {
  it('separa el campo técnico del mensaje y conserva código e id del emisor', () => {
    const error = parseRedEDocError(
      http400({
        detail: 'La solicitud no es válida.',
        errores: [
          {
            codigo: 'emisor_duplicado',
            mensaje:
              'numero_identificacion: El emisor con identificación 900000000 ya está dado de alta.',
          },
        ],
        emisor_id: 7,
      }),
      'genérico',
    );

    expect(error.detalles).toEqual([
      {
        codigo: 'emisor_duplicado',
        campo: 'numero_identificacion',
        mensaje: 'El emisor con identificación 900000000 ya está dado de alta.',
      },
    ]);
    expect(error.mensajes).toEqual([
      'El emisor con identificación 900000000 ya está dado de alta.',
    ]);
    expect(error.emisorId).toBe(7);
    expect(tieneCodigo(error, 'emisor_duplicado')).toBe(true);
    expect(tieneCodigo(error, 'otro')).toBe(false);
  });

  it('un mensaje sin prefijo queda como error general', () => {
    const error = parseRedEDocError(
      http400({ errores: [{ codigo: 'x', mensaje: 'Algo salió mal: revisalo.' }] }),
      'genérico',
    );
    expect(error.detalles[0].campo).toBeNull();
    expect(error.detalles[0].mensaje).toBe('Algo salió mal: revisalo.');
  });

  it('descarta errores sin mensaje y no inventa id del emisor', () => {
    const error = parseRedEDocError(
      http400({ errores: [{ codigo: 'x' }, 'basura', { mensaje: 'clave: Clave incorrecta.' }] }),
      'genérico',
    );
    expect(error.detalles).toEqual([{ codigo: '', campo: 'clave', mensaje: 'Clave incorrecta.' }]);
    expect(error.emisorId).toBeNull();
  });

  it('sin errores detallados cae al detail', () => {
    const error = parseRedEDocError(http400({ detail: 'La solicitud no es válida.' }), 'genérico');
    expect(error.detalles).toEqual([]);
    expect(error.mensajes).toEqual(['La solicitud no es válida.']);
  });

  it('sin nada legible cae al genérico, nunca a una lista vacía', () => {
    expect(parseRedEDocError(new Error('red'), 'genérico').mensajes).toEqual(['genérico']);
  });
});

describe('repartirErrores', () => {
  const error = (mensajes: readonly string[]) =>
    parseRedEDocError(
      http400({ errores: mensajes.map((mensaje) => ({ codigo: 'x', mensaje })) }),
      'genérico',
    );

  it('lleva cada error a su input y devuelve el resto', () => {
    const pin = new FormControl('');
    const resto = repartirErrores(error(['pin: PIN inválido.', 'El emisor no existe.']), { pin });
    expect(pin.errors).toEqual({ serverError: 'PIN inválido.' });
    expect(pin.touched).toBe(true);
    expect(resto?.mensajes).toEqual(['El emisor no existe.']);
  });

  it('si todos eran de campo no queda nada para la banda', () => {
    const pin = new FormControl('');
    expect(repartirErrores(error(['pin: PIN inválido.']), { pin })).toBeNull();
  });

  it('un campo que no está en el formulario sigue yendo a la banda', () => {
    const pin = new FormControl('');
    const original = error(['tipo: Tipo inválido.']);
    expect(repartirErrores(original, { pin })).toBe(original);
    expect(pin.errors).toBeNull();
  });
});
