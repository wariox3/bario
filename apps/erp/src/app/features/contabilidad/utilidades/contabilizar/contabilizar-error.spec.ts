import { HttpErrorResponse } from '@angular/common/http';
import { parseContabilizarErrores } from './contabilizar-error';

function http400(body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status: 400, error: body });
}

describe('parseContabilizarErrores', () => {
  it('devuelve un error por documento con su mensaje', () => {
    const errores = parseContabilizarErrores(
      http400({
        detail:
          'Documento 157 (NOTA CREDITO COMPRA 2): detalle 496: el impuesto «IVA 19%»: la cuenta 240810 exige base.',
        errores: [
          {
            documento_id: 157,
            mensaje: 'Detalle 496: el impuesto «IVA 19%»: la cuenta 240810 exige base.',
          },
          { documento_id: 160, mensaje: 'Sin cuenta configurada.' },
        ],
      }),
    );

    expect(errores).toEqual([
      {
        documentoId: 157,
        mensaje: 'Detalle 496: el impuesto «IVA 19%»: la cuenta 240810 exige base.',
      },
      { documentoId: 160, mensaje: 'Sin cuenta configurada.' },
    ]);
  });

  it('descarta las entradas sin id o sin mensaje', () => {
    const errores = parseContabilizarErrores(
      http400({ errores: [{ mensaje: 'x' }, { documento_id: 1, mensaje: '  ' }, 'texto'] }),
    );
    expect(errores).toEqual([]);
  });

  it('devuelve vacío si el cuerpo no trae errores', () => {
    expect(parseContabilizarErrores(http400({ detail: 'Algo falló.' }))).toEqual([]);
    expect(parseContabilizarErrores(new Error('red'))).toEqual([]);
  });
});
