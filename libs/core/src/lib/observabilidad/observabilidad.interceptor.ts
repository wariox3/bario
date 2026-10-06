import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import * as Sentry from '@sentry/angular';
import { catchError, throwError } from 'rxjs';
import { normalizeHttpError } from '../utils/error-normalizer';
import { RespuestaServidorError } from './observabilidad.errors';

/**
 * Reporta a Sentry las respuestas 5xx del backend. Va **último** en
 * `withInterceptors`: así ve la respuesta cruda de cada intento, antes del
 * refresh de token y de los toasts del `errorInterceptor`.
 *
 * Los 4xx no se reportan: son validaciones, permisos o recursos borrados —
 * casi nunca un bug, y llenarían Sentry de ruido. El resto de los
 * `HttpErrorResponse` que nadie atrape tampoco llegan (ver `beforeSend` en
 * `iniciarObservabilidad`): este interceptor es el único dueño de HTTP.
 */
export const observabilidadInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status >= 500) {
        reportarRespuestaServidor(req.method, req.url, error);
      }
      return throwError(() => error);
    }),
  );

function reportarRespuestaServidor(metodo: string, url: string, error: HttpErrorResponse): void {
  const ruta = normalizarRuta(url);
  const requestId = normalizeHttpError(error).requestId;

  Sentry.captureException(new RespuestaServidorError(metodo, ruta, error.status), {
    // Un issue por endpoint y status, no uno por id de documento.
    fingerprint: ['respuesta-servidor', metodo, ruta, String(error.status)],
    tags: {
      'http.method': metodo,
      'http.status': String(error.status),
      // El mismo id que registra el backend: cruza este evento con su Sentry.
      request_id: requestId ?? undefined,
    },
  });
}

/** `/api/documento/123/?page=2` → `/api/documento/:id/` */
function normalizarRuta(url: string): string {
  const sinQuery = url.split('?')[0];
  return sinQuery
    .split('/')
    .map((segmento) => (/^\d+$|^[0-9a-f-]{32,36}$/i.test(segmento) ? ':id' : segmento))
    .join('/');
}
