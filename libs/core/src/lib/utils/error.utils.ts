import { HttpErrorResponse } from '@angular/common/http';
import { normalizeInternal } from './error-normalizer';

export interface ApiError {
  code: string;
  message: string;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  request_id: string;
}

/**
 * @deprecated Usa `normalizeHttpError` de `./error-normalizer`, que entiende todos los
 * formatos de error del backend (envelope envuelto, DRF, detail, string plano).
 */
export function parseApiError(err: HttpErrorResponse): ApiError | null {
  const body = err.error;
  if (
    body &&
    typeof body === 'object' &&
    'success' in body &&
    body.success === false &&
    body.error
  ) {
    return body.error as ApiError;
  }
  return null;
}

export function isUnverifiedAccountError(err: unknown): boolean {
  const httpErr = err as HttpErrorResponse | undefined;
  if (!httpErr?.error) return false;
  if (httpErr.error?.verificado === false) return true;
  if (httpErr.error?.error?.is_verified === false) return true;
  return false;
}

export function isSuscripcionVencidaError(err: unknown): boolean {
  const httpErr = err as HttpErrorResponse | undefined;
  const body = httpErr?.error;
  if (!body || typeof body !== 'object') return false;
  return (body as { codigo?: string }).codigo === 'suscripcion_vencida';
}

/**
 * Extrae un mensaje legible de un error HTTP. Si el body no trae un mensaje real,
 * retorna el `fallback` provisto por el caller.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  const { message, messageFromBody } = normalizeInternal(err);
  return messageFromBody ? message : fallback;
}

/**
 * `extractErrorMessage` para peticiones `responseType: 'blob'` (descargas): ahí
 * el cuerpo del error llega como `Blob` y no se puede leer el `detail` sin
 * antes pasarlo a texto. Un cuerpo que no es JSON cae al `fallback`.
 */
export async function extractBlobErrorMessage(err: unknown, fallback: string): Promise<string> {
  if (!(err instanceof HttpErrorResponse) || !(err.error instanceof Blob)) {
    return extractErrorMessage(err, fallback);
  }
  try {
    const body: unknown = JSON.parse(await leerTexto(err.error));
    const parsed = new HttpErrorResponse({
      error: body,
      headers: err.headers,
      status: err.status,
      statusText: err.statusText,
      url: err.url ?? undefined,
    });
    return extractErrorMessage(parsed, fallback);
  } catch {
    return fallback;
  }
}

/** `FileReader` y no `Blob.text()`: este último no existe en el jsdom de los tests. */
function leerTexto(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}
