import { computed, inject, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { TENANT_SCOPED } from '../tenant/tenant-http-context';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import {
  BaseUsuario,
  LoginMfaRequest,
  LoginRequest,
  LoginResult,
  MfaDesafio,
  MfaDesafioResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
} from '../models/auth.model';
import { ENVIRONMENT } from '../tokens';
import { SesionNoConfirmadaError } from './auth.errors';
import { TokenRefreshService } from '../services/token-refresh.service';

export interface AuthApiEndpoints {
  login: string;
  loginMfa: string;
  loginMfaReenviar: string;
  register: string;
  logout: string;
  refresh: string;
  me: string;
  forgotPassword: string;
  resetPassword: string;
  resendVerification: string;
  verifyEmail: string;
}

export const AUTH_API_ENDPOINTS: AuthApiEndpoints = {
  login: '/seguridad/login/',
  loginMfa: '/seguridad/login/mfa/',
  loginMfaReenviar: '/seguridad/login/mfa/reenviar/',
  register: '/seguridad/usuario/',
  logout: '/seguridad/logout/',
  refresh: '/seguridad/refresh/',
  me: '/seguridad/me/',
  forgotPassword: '/seguridad/usuario/recuperar-clave/',
  resetPassword: '/seguridad/usuario/restablecer-clave/',
  resendVerification: '/seguridad/usuario/reenviar-verificacion/',
  verifyEmail: '/seguridad/usuario/verificar-email/',
};

// /me queda fuera: un 401 en ese endpoint debe disparar el refresh automático.
export const AUTH_DEFAULT_SKIP_URLS: string[] = [
  AUTH_API_ENDPOINTS.login,
  // Los tres pasos del login son pre-sesión: un 401 acá es "credenciales o código
  // incorrectos", no una sesión vencida, y no debe disparar el refresh.
  AUTH_API_ENDPOINTS.loginMfa,
  AUTH_API_ENDPOINTS.loginMfaReenviar,
  AUTH_API_ENDPOINTS.register,
  AUTH_API_ENDPOINTS.logout,
  AUTH_API_ENDPOINTS.refresh,
  AUTH_API_ENDPOINTS.forgotPassword,
  AUTH_API_ENDPOINTS.resetPassword,
  AUTH_API_ENDPOINTS.resendVerification,
  AUTH_API_ENDPOINTS.verifyEmail,
];

/**
 * Lee el desafío de la respuesta del login. Devuelve `null` cuando la respuesta es la de
 * siempre (sesión iniciada), sin asumir nada de su forma.
 */
/**
 * ¿Esta respuesta de `login/` es un desafío de segundo factor? Ver `MfaDesafioResponse`:
 * el mismo endpoint responde esto o emite cookies, y solo `mfa_requerido` los distingue.
 *
 * Valida en runtime en vez de castear: confundir las dos ramas manda al dashboard sin
 * sesión, y el guard rebota de vuelta al login en un bucle sin explicación. Sin
 * `mfa_token` no hay desafío posible, así que ahí devuelve `null`; un `metodo` ausente sí
 * se tolera —solo cambia el texto que se lee— y cae en `''`.
 */
function leerDesafioMfa(respuesta: unknown): MfaDesafio | null {
  if (respuesta === null || typeof respuesta !== 'object') return null;

  const cuerpo = respuesta as Partial<Record<keyof MfaDesafioResponse, unknown>>;
  if (cuerpo.mfa_requerido !== true) return null;
  if (typeof cuerpo.mfa_token !== 'string') return null;

  return {
    mfa_token: cuerpo.mfa_token,
    metodo: typeof cuerpo.metodo === 'string' ? cuerpo.metodo : '',
  };
}

export abstract class BaseAuthService<TUser extends BaseUsuario> {
  protected readonly http = inject(HttpClient);
  protected readonly router = inject(Router);
  protected readonly tokenRefresh = inject(TokenRefreshService);
  protected readonly environment = inject(ENVIRONMENT);

  protected readonly apiEndpoints: AuthApiEndpoints = AUTH_API_ENDPOINTS;
  protected abstract readonly loginRoute: string;

  /**
   * Los endpoints de sesión viven en el schema público: nunca llevan
   * `X-Tenant`. Cada petición de este servicio se marca con este context.
   */
  private globalContext(): HttpContext {
    return new HttpContext().set(TENANT_SCOPED, false);
  }

  private readonly _currentUser = signal<TUser | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._currentUser());

  /**
   * Paso 1 del login. Con MFA activo el backend **no emite cookies**: responde
   * `{ mfa_requerido: true, mfa_token, metodo }` y manda el código.
   *
   * Por eso no se puede encadenar `me()` a ciegas — sin sesión da 401, y como `me()`
   * traga el error devolvería `null`, que se lee como login exitoso. La unión obliga a
   * distinguir los dos desenlaces.
   */
  login(credentials: LoginRequest): Observable<LoginResult<TUser>> {
    return this.http
      .post<unknown>(`${this.environment.apiUrl}${this.apiEndpoints.login}`, credentials, {
        context: this.globalContext(),
      })
      .pipe(
        switchMap((respuesta) => {
          const desafio = leerDesafioMfa(respuesta);
          if (desafio !== null) {
            return of<LoginResult<TUser>>({ estado: 'mfa', desafio });
          }
          return this.meTrasAutenticar().pipe(
            map((usuario): LoginResult<TUser> => ({ estado: 'sesion', usuario })),
          );
        }),
      );
  }

  /** Paso 2 del login: confirma el código del desafío y recién ahí llegan las cookies. */
  loginMfa(data: LoginMfaRequest): Observable<TUser | null> {
    return this.http
      .post(`${this.environment.apiUrl}${this.apiEndpoints.loginMfa}`, data, {
        context: this.globalContext(),
      })
      .pipe(switchMap(() => this.meTrasAutenticar()));
  }

  /**
   * El `/me` que va pegado a un login recién aceptado.
   *
   * Un fallo acá no es "credenciales inválidas" —las cookies ya están emitidas— así que
   * se marca como tal: `SesionNoConfirmadaError`. Sin esto el login trata el error como
   * código incorrecto y manda a reintentar un código ya quemado.
   */
  private meTrasAutenticar(): Observable<TUser | null> {
    return this.me().pipe(
      catchError((error: unknown) => {
        throw new SesionNoConfirmadaError(error);
      }),
    );
  }

  /**
   * Reenvía el código del desafío de login.
   *
   * OJO: el backend **no reinicia la expiración ni los intentos** — es otro correo con
   * el mismo desafío. Quien pinte un reloj no debe reiniciarlo acá.
   */
  loginMfaReenviar(mfaToken: string): Observable<void> {
    return this.http.post<void>(
      `${this.environment.apiUrl}${this.apiEndpoints.loginMfaReenviar}`,
      { mfa_token: mfaToken },
      { context: this.globalContext() },
    );
  }

  /**
   * Quién está logueado. `null` significa **una sola cosa**: no hay sesión (401).
   *
   * Cualquier otro error —red caída, 500, timeout— se re-lanza en vez de convertirse en
   * `null`: quien llama no puede distinguir "no hay sesión" de "no pude preguntar", y
   * confundirlos hace que un blip de red se lea como credenciales inválidas. Por lo mismo
   * `_currentUser` solo se limpia con el 401: un fallo transitorio no debe desloguear
   * visualmente a nadie.
   *
   * Los `provideAppInitializer` de las apps ya envuelven esta llamada en un `catch`, así
   * que el arranque sigue tolerando un backend caído.
   */
  me(): Observable<TUser | null> {
    return this.http
      .get<TUser>(`${this.environment.apiUrl}${this.apiEndpoints.me}`, {
        context: this.globalContext(),
      })
      .pipe(
        tap((user) => {
          this._currentUser.set(user);
        }),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this._currentUser.set(null);
            return of(null);
          }
          throw error;
        }),
      );
  }

  refresh(): Observable<void> {
    return this.http.post<void>(
      `${this.environment.apiUrl}${this.apiEndpoints.refresh}`,
      {},
      {
        context: this.globalContext(),
      },
    );
  }

  logout(): void {
    this.clearSession();
    this.http
      .post(
        `${this.environment.apiUrl}${this.apiEndpoints.logout}`,
        {},
        {
          context: this.globalContext(),
        },
      )
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  forgotPassword(email: string, captchaToken?: string): Observable<void> {
    return this.http.post<void>(
      `${this.environment.apiUrl}${this.apiEndpoints.forgotPassword}`,
      {
        email,
        ...(captchaToken && { turnstile_token: captchaToken }),
      },
      { context: this.globalContext() },
    );
  }

  resetPassword(token: string, password: string, captchaToken?: string): Observable<void> {
    return this.http.post<void>(
      `${this.environment.apiUrl}${this.apiEndpoints.resetPassword}`,
      {
        token,
        nueva_clave: password,
        ...(captchaToken && { turnstile_token: captchaToken }),
      },
      { context: this.globalContext() },
    );
  }

  resendVerification(data: ResendVerificationRequest): Observable<void> {
    return this.http.post<void>(
      `${this.environment.apiUrl}${this.apiEndpoints.resendVerification}`,
      data,
      { context: this.globalContext() },
    );
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${this.environment.apiUrl}${this.apiEndpoints.register}`,
      data,
      { context: this.globalContext() },
    );
  }

  verifyEmail(token: string): Observable<void> {
    const params = new HttpParams().set('token', token);
    return this.http.get<void>(`${this.environment.apiUrl}${this.apiEndpoints.verifyEmail}`, {
      params,
      context: this.globalContext(),
    });
  }

  protected setCurrentUser(user: TUser | null): void {
    this._currentUser.set(user);
  }

  clearSession(): void {
    const hadSession = !!this._currentUser();
    this._currentUser.set(null);
    this.tokenRefresh.reset();
    if (hadSession) {
      this.router.navigate([this.loginRoute]);
    }
  }
}
