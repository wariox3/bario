import { inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENVIRONMENT } from '../tokens';
import { ERROR_TOAST } from '../interceptors/error-http-context';
import { TENANT_SCOPED } from '../tenant/tenant-http-context';

export type ParamValue = string | number | boolean | null | undefined;

/** Ajustes por petición, para los casos que se salen del default del servicio. */
export interface RequestOptions {
  /**
   * `false` = el `errorInterceptor` no muestra su toast: la pantalla renderiza
   * el error por su cuenta (ver `ERROR_TOAST`). El error sigue llegando al
   * `error:` del suscriptor.
   */
  readonly errorToast?: boolean;
  /**
   * Override puntual del scope de tenant del servicio, para servicios con
   * endpoints mixtos (ej. `ContenedorService` es global pero
   * `usuario-cliente-permiso/` viaja con `X-Tenant`). Sin valor, manda el
   * `tenantScoped` de la clase.
   */
  readonly tenantScoped?: boolean;
}

export function buildHttpParams(params: Record<string, ParamValue>): HttpParams {
  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null) {
      httpParams = httpParams.set(key, String(value));
    }
  }
  return httpParams;
}

export abstract class BaseHttpService {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = inject(ENVIRONMENT).apiUrl;

  /**
   * ¿Los endpoints de este servicio se resuelven dentro del tenant activo?
   *
   * Default `true`: la mayoría de los masters del ERP son tenant-scoped. Los
   * servicios cuyo endpoint vive en el schema público (contenedor, catálogos
   * globales, selección de usuarios para invitar) lo marcan con
   * `protected override readonly tenantScoped = false;`.
   */
  protected readonly tenantScoped: boolean = true;

  /**
   * Context HTTP con el scope de tenant del servicio y, si el llamador lo pide,
   * el opt-out del toast de error (cuando la pantalla muestra el error ella).
   */
  private context(opts?: RequestOptions): HttpContext {
    const context = new HttpContext().set(TENANT_SCOPED, opts?.tenantScoped ?? this.tenantScoped);
    return opts?.errorToast === false ? context.set(ERROR_TOAST, false) : context;
  }

  protected get<T>(
    path: string,
    params?: Record<string, ParamValue>,
    opts?: RequestOptions,
  ): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`, {
      params: buildHttpParams(params ?? {}),
      context: this.context(opts),
    });
  }

  protected post<T>(
    path: string,
    body: unknown,
    params?: Record<string, ParamValue>,
    opts?: RequestOptions,
  ): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body, {
      params: buildHttpParams(params ?? {}),
      context: this.context(opts),
    });
  }

  protected put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body, { context: this.context() });
  }

  protected patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body, { context: this.context() });
  }

  protected delete<T = void>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`, { context: this.context() });
  }
}
