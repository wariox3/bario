import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseHttpService, ParamValue } from '../services/base-http.service';
import { PaginatedResponse } from '../models/pagination.model';
import { fetchAllPages } from '../data-list/data/fetch-all-pages';
import { CatalogoCacheService } from './catalogo-cache.service';

/**
 * Opción genérica `{ id, nombre }` que devuelven los endpoints `seleccionar`.
 * Admite campos extra del endpoint (p. ej. `codigo`), accesibles desde un
 * `displayWith` para componer la etiqueta.
 */
export interface ErpSelectOption {
  readonly id: number;
  readonly nombre: string;
  readonly [key: string]: unknown;
}

/**
 * Fetch de opciones para los componentes `app-api-select` y `app-api-autocomplete`.
 *
 * Centraliza el HTTP en la capa de servicio (sobre `BaseHttpService`) en vez de
 * inyectar `HttpClient` en la vista: reutiliza `buildHttpParams`, la base URL y
 * el `HttpContext` con tenant scope. Tenant-scoped por default, como el resto de
 * los masters del ERP.
 */
@Injectable({ providedIn: 'root' })
export class ErpSelectDataService extends BaseHttpService {
  private readonly cache = inject(CatalogoCacheService);

  /**
   * Trae las opciones de un endpoint paginado `seleccionar`.
   *
   * Genérico en la forma de la fila: por default devuelve `ErpSelectOption`
   * (`{ id, nombre }`), pero un consumidor que necesite más campos del endpoint
   * (p. ej. `codigo` en cuentas) puede tipar la respuesta con `T`.
   */
  fetchOptions<T = ErpSelectOption>(
    endpoint: string,
    params?: Record<string, ParamValue>,
  ): Observable<T[]> {
    return this.get<PaginatedResponse<T>>(endpoint, params).pipe(map((res) => [...res.results]));
  }

  /**
   * Trae **todas** las opciones de un `seleccionar`, recorriendo las páginas.
   *
   * El backend pagina de a 25 sin importar el `limit`. Un autocomplete busca en
   * el servidor y le basta `fetchOptions`; un dropdown que carga una vez y
   * filtra en el cliente necesita el catálogo completo, o lo que pase de 25 no
   * aparece.
   *
   * Pasa por `CatalogoCacheService`: el mismo catálogo pedido varias veces en
   * la misma pantalla sale de una sola petición, y una escritura al recurso lo
   * invalida (`catalogoCacheInterceptor`).
   */
  fetchAllOptions<T = ErpSelectOption>(
    endpoint: string,
    params?: Record<string, ParamValue>,
  ): Observable<T[]> {
    return this.cache.obtener(endpoint, params, () =>
      fetchAllPages((page) => this.get<PaginatedResponse<T>>(endpoint, { ...params, page })),
    );
  }
}
