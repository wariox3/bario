import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ERROR_TOAST } from '../interceptors/error-http-context';
import { TENANT_SCOPED } from '../tenant/tenant-http-context';
import { ENVIRONMENT } from '../tokens';
import { buildHttpParams, type ParamValue } from '../services/base-http.service';
import { imprimirBlob, parseFilename, triggerBrowserDownload } from './file-download.utils';

export interface FileDownloadOptions {
  /** Filename usado si el backend no expone `Content-Disposition`. */
  readonly fallbackFilename?: string;
  /** ¿La petición va al tenant activo? Default `true`. */
  readonly tenantScoped?: boolean;
  /** Verbo HTTP. Default `GET` — usar `POST` para endpoints que requieran body. */
  readonly method?: 'GET' | 'POST';
  /** Body opcional cuando `method = 'POST'`. */
  readonly body?: unknown;
  /** Query params opcionales (aplican tanto a `GET` como a `POST`). */
  readonly params?: Record<string, ParamValue>;
  /**
   * `false` apaga el toast del interceptor: el caller avisa por su cuenta (el
   * cuerpo del error llega como `Blob`; ver `extractBlobErrorMessage`).
   */
  readonly errorToast?: boolean;
}

/**
 * Helper cross-app para descargar archivos binarios autenticados desde el
 * backend. Inyectable en cualquier servicio o componente del monorepo.
 *
 * - Usa `HttpClient` directo (no `BaseHttpService`) porque el contrato es
 *   binario, no JSON tipado.
 * - Hereda `authInterceptor` (cookies HTTP-only) y `tenantInterceptor` (header
 *   `X-Tenant`) automáticamente.
 * - El blob se consume internamente (descarga o diálogo de impresión), por
 *   eso devuelve `Observable<void>`: el caller solo necesita saber cuándo
 *   terminó (para apagar un spinner) y manejar errores.
 */
@Injectable({ providedIn: 'root' })
export class FileDownloadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(ENVIRONMENT).apiUrl;

  /** Descarga el archivo con el nombre que mande el backend. */
  download(path: string, options: FileDownloadOptions = {}): Observable<void> {
    return this.fetch(path, options).pipe(
      map(({ blob, filename }) => triggerBrowserDownload(blob, filename)),
    );
  }

  /**
   * Pide un PDF y abre directo el diálogo de impresión, sin pasar por otra
   * pestaña. Si el navegador no lo permite, lo abre en una pestaña (ver
   * `imprimirBlob`).
   */
  print(path: string, options: FileDownloadOptions = {}): Observable<void> {
    return this.fetch(path, options).pipe(
      map(({ blob, filename }) => imprimirBlob(blob, filename)),
    );
  }

  private fetch(
    path: string,
    options: FileDownloadOptions,
  ): Observable<{ readonly blob: Blob; readonly filename: string }> {
    const url = `${this.baseUrl}${path}`;
    const context = new HttpContext()
      .set(TENANT_SCOPED, options.tenantScoped ?? true)
      .set(ERROR_TOAST, options.errorToast ?? true);
    const fallback = options.fallbackFilename ?? 'download';
    const params = options.params ? buildHttpParams(options.params) : undefined;

    const request$ =
      (options.method ?? 'GET') === 'POST'
        ? this.http.post(url, options.body ?? null, {
            observe: 'response',
            responseType: 'blob',
            context,
            params,
          })
        : this.http.get(url, {
            observe: 'response',
            responseType: 'blob',
            context,
            params,
          });

    return request$.pipe(
      map((response) => {
        const blob = response.body;
        if (!blob || blob.size === 0) {
          throw new Error('Respuesta vacía del servidor');
        }
        const filename = parseFilename(response.headers.get('content-disposition'), fallback);
        return { blob, filename };
      }),
    );
  }
}
