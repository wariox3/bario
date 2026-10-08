import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, EMPTY, Observable, switchMap, throwError } from 'rxjs';
import { AuthServiceContract, RoutePaths } from '../tokens';
import { ToastService } from '../services/toast.service';
import { TokenRefreshService } from '../services/token-refresh.service';
import { TenantService } from '../tenant/tenant.service';
import { ForbiddenPageStore } from '../errors/forbidden-page.store';
import { normalizeHttpError } from '../utils/error-normalizer';
import { isSuscripcionVencidaError, isUnverifiedAccountError } from '../utils/error.utils';

function isAuthUrl(url: string, skipUrls: string[]): boolean {
  return skipUrls.some((endpoint) => url.includes(endpoint));
}

export function handleConnectionError(
  toast: ToastService,
  error: HttpErrorResponse,
): Observable<never> {
  toast.error('Error de conexión', normalizeHttpError(error).message);
  return throwError(() => error);
}

export function handleUnauthorized(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthServiceContract,
  tokenRefresh: TokenRefreshService,
  error: HttpErrorResponse,
  skipUrls: string[],
): Observable<HttpEvent<unknown>> {
  if (isAuthUrl(req.url, skipUrls)) {
    return throwError(() => error);
  }

  if (!tokenRefresh.refreshing) {
    tokenRefresh.startRefresh();

    return authService.refresh().pipe(
      switchMap(() => {
        tokenRefresh.completeRefresh();
        return next(req);
      }),
      catchError((refreshError) => {
        tokenRefresh.failRefresh();
        authService.clearSession();
        return throwError(() => refreshError);
      }),
    );
  }

  return tokenRefresh.waitForRefresh().pipe(
    switchMap((success) => {
      if (success) {
        return next(req);
      }
      return throwError(() => error);
    }),
  );
}

/**
 * ¿El 403 fue sobre lo que **da contenido a la pantalla**, y no sobre una acción
 * puntual?
 *
 * Los listados del monorepo son, por convención, un `POST` a `.../lista/`. Si te
 * niegan ese, la pantalla no tiene nada que mostrar y hay que reemplazarla. Si
 * te niegan un guardado, un export o un borrado, la pantalla sigue sirviendo y
 * el toast alcanza.
 *
 * Deliberadamente **no** se cuenta cualquier `GET`: los selects y modales de un
 * formulario también hacen GET, y un 403 en uno de ellos no invalida la pantalla
 * entera. Preferimos quedarnos cortos y dejar el toast a bloquear de más.
 */
function isPageContentRequest(req: HttpRequest<unknown>): boolean {
  return req.method === 'POST' && /\/lista\/?(\?|$)/.test(req.url);
}

export function handleForbidden(
  req: HttpRequest<unknown>,
  toast: ToastService,
  router: Router,
  tenant: TenantService,
  routes: RoutePaths,
  forbiddenPage: ForbiddenPageStore,
  error: HttpErrorResponse,
): Observable<never> {
  if (isUnverifiedAccountError(error)) {
    return throwError(() => error);
  }

  if (isSuscripcionVencidaError(error)) {
    const target = routes.dashboard.root;
    if (!router.url.startsWith(target)) {
      tenant.clear();
      toast.warn('Suscripción vencida', normalizeHttpError(error).message);
      router.navigateByUrl(target);
    }
    return throwError(() => error);
  }

  const { message } = normalizeHttpError(error);

  // Nos negaron el contenido de la pantalla: la reemplaza el estado de acceso
  // denegado que rinde el layout. Se corta el error con `EMPTY` en vez de
  // propagarlo porque, si no, la página encima toastearía su "no se pudo
  // cargar" — el usuario terminaría con dos avisos y una pantalla en blanco,
  // que es justo lo que este camino viene a arreglar. El observable completa,
  // así que los `finalize` de los componentes (spinners) corren igual.
  if (isPageContentRequest(req)) {
    forbiddenPage.block(message);
    return EMPTY;
  }

  toast.error('Acceso denegado', message);
  return throwError(() => error);
}

export function handleNotFoundOrClient(
  toast: ToastService,
  error: HttpErrorResponse,
): Observable<never> {
  const normalized = normalizeHttpError(error);
  const summary =
    normalized.kind === 'notFound'
      ? 'No encontrado'
      : normalized.kind === 'conflict'
        ? 'Conflicto'
        : 'Solicitud no procesada';
  toast.error(summary, normalized.message);
  return throwError(() => error);
}

export function handleTooManyRequests(
  toast: ToastService,
  error: HttpErrorResponse,
): Observable<never> {
  toast.warn('Demasiadas solicitudes', normalizeHttpError(error).message);
  return throwError(() => error);
}

export function handleServerError(
  toast: ToastService,
  error: HttpErrorResponse,
): Observable<never> {
  toast.error('Error del servidor', normalizeHttpError(error).message);
  return throwError(() => error);
}
