import { HttpErrorResponse } from '@angular/common/http';
import { parseContabilizarError } from './contabilizar-error';

function http400(body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status: 400, error: body });
}

describe('parseContabilizarError', () => {
  it('devuelve el detail y un mensaje por error', () => {
    const error = parseContabilizarError(
      http400({
        detail: 'Documento 157 (NOTA CREDITO COMPRA 2) no se pudo contabilizar.',
        errores: [
          {
            documento_id: 157,
            mensaje: 'Detalle 496: el impuesto «IVA 19%»: la cuenta 240810 exige base.',
          },
          { documento_id: 157, mensaje: 'Sin cuenta configurada.' },
        ],
      }),
    );

    expect(error).toEqual({
      detail: 'Documento 157 (NOTA CREDITO COMPRA 2) no se pudo contabilizar.',
      mensajes: [
        'Detalle 496: el impuesto «IVA 19%»: la cuenta 240810 exige base.',
        'Sin cuenta configurada.',
      ],
    });
  });

  it('descarta las entradas sin mensaje', () => {
    const error = parseContabilizarError(
      http400({ errores: [{ documento_id: 1 }, { mensaje: '  ' }, 'texto'] }),
    );
    expect(error).toEqual({ detail: null, mensajes: [] });
  });

  it('devuelve vacío si no es un error HTTP con cuerpo', () => {
    expect(parseContabilizarError(http400({ detail: 'Algo falló.' }))).toEqual({
      detail: 'Algo falló.',
      mensajes: [],
    });
    expect(parseContabilizarError(new Error('red'))).toEqual({ detail: null, mensajes: [] });
  });
});
