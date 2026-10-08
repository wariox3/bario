import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseHttpService, ParamValue } from '../services/base-http.service';
import { PaginatedResponse } from '../models/pagination.model';

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
}
