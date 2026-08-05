import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AUTH_SERVICE, AUTH_SKIP_URLS, ROUTE_PATHS_TOKEN } from '../tokens';
import { ToastService } from '../services/toast.service';
import { TokenRefreshService } from '../services/token-refresh.service';
import { TenantService } from '../tenant/tenant.service';
import { ForbiddenPageStore } from '../errors/forbidden-page.store';
import { classifyStatus } from '../utils/error-normalizer';
import { ERROR_TOAST } from './error-http-context';
import {
  handleConnectionError,
  handleForbidden,
  handleNotFoundOrClient,
  handleServerError,
  handleTooManyRequests,
  handleUnauthorized,
} from './error-handlers';

/**
 * Contrato de manejo de errores HTTP — quién muestra el error:
 *
 * - network (0)          → toast.error (interceptor)
 * - validation (400/422) → SIN toast; lo renderiza el formulario/banner inline
 * - unauthorized (401)   → refresh de token; sin toast
 * - forbidden (403)      → si niega el listado de la pantalla, la reemplaza por
 *                          el estado de acceso denegado (`ForbiddenPageStore`);
 *                          si no, toast.error (salvo cuenta sin verificar)
 * - notFound (404)       → toast.error
 * - conflict (409)       → toast.error
 * - rateLimit (429)      → toast.warn
 * - client (otro 4xx)    → toast.error
 * - server (>=500)       → toast.error
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AUTH_SERVICE);
  const toast = inject(ToastService);
  const tokenRefresh = inject(TokenRefreshService);
  const skipUrls = inject(AUTH_SKIP_URLS);
  const router = inject(Router);
  const tenant = inject(TenantService);
  const routes = inject(ROUTE_PATHS_TOKEN);
  const forbiddenPage = inject(ForbiddenPageStore);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const kind = classifyStatus(error.status);

      // La petición declaró que la pantalla muestra el error por su cuenta: no
      // se duplica con un toast. El 401 no se salta — no es un aviso, es el
      // refresh de token.
      if (!req.context.get(ERROR_TOAST) && kind !== 'unauthorized') {
        return throwError(() => error);
      }

      switch (kind) {
        case 'network':
          return handleConnectionError(toast, error);
        case 'unauthorized':
          return handleUnauthorized(req, next, authService, tokenRefresh, error, skipUrls);
        case 'forbidden':
          return handleForbidden(req, toast, router, tenant, routes, forbiddenPage, error);
        case 'notFound':
        case 'conflict':
        case 'client':
          return handleNotFoundOrClient(toast, error);
        case 'rateLimit':
          return handleTooManyRequests(toast, error);
        case 'server':
        case 'unknown':
          return handleServerError(toast, error);
        case 'validation':
          console.debug(`[HTTP ${error.status}] validación — la maneja el formulario`, error.url);
          return throwError(() => error);
      }
    }),
  );
};
