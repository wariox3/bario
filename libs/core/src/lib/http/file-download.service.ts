import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { TENANT_SCOPED } from '../tenant/tenant-http-context';
import { ENVIRONMENT } from '../tokens';
import { buildHttpParams, type ParamValue } from '../services/base-http.service';
import { parseFilename, triggerBrowserDownload } from './file-download.utils';

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
}

/**
 * Helper cross-app para descargar archivos binarios autenticados desde el
 * backend. Inyectable en cualquier servicio o componente del monorepo.
 *
 * - Usa `HttpClient` directo (no `BaseHttpService`) porque el contrato es
 *   binario, no JSON tipado.
 * - Hereda `authInterceptor` (cookies HTTP-only) y `tenantInterceptor` (header
 *   `X-Tenant`) automáticamente.
 * - El blob se consume internamente disparando la descarga del navegador, por
 *   eso devuelve `Observable<void>`: el caller solo necesita saber cuándo
 *   terminó (para apagar un spinner) y manejar errores.
 */
@Injectable({ providedIn: 'root' })
export class FileDownloadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(ENVIRONMENT).apiUrl;

  download(path: string, options: FileDownloadOptions = {}): Observable<void> {
    const url = `${this.baseUrl}${path}`;
    const context = new HttpContext().set(TENANT_SCOPED, options.tenantScoped ?? true);
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
        triggerBrowserDownload(blob, filename);
      }),
    );
  }
}
