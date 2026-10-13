import { HttpErrorResponse } from '@angular/common/http';
import { extractBlobErrorMessage } from './error.utils';

const blobError = (body: string): HttpErrorResponse =>
  new HttpErrorResponse({ error: new Blob([body]), status: 400 });

describe('extractBlobErrorMessage', () => {
  it('lee el detail de un error que llegó como Blob', async () => {
    const err = blobError(JSON.stringify({ detail: 'El documento no tiene XML firmado.' }));
    await expect(extractBlobErrorMessage(err, 'Falló')).resolves.toBe(
      'El documento no tiene XML firmado.',
    );
  });

  it('cae al fallback si el Blob no es JSON', async () => {
    await expect(extractBlobErrorMessage(blobError('<html>'), 'Falló')).resolves.toBe('Falló');
  });

  it('con un cuerpo JSON normal se comporta como extractErrorMessage', async () => {
    const err = new HttpErrorResponse({ error: { detail: 'Motivo' }, status: 400 });
    await expect(extractBlobErrorMessage(err, 'Falló')).resolves.toBe('Motivo');
  });
});
