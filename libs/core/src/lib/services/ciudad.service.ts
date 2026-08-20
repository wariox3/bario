import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Ciudad } from '../models/ciudad.model';
import { PaginatedResponse } from '../models/pagination.model';
import { BaseHttpService } from './base-http.service';

/**
 * De dónde salen las ciudades. Es el mismo catálogo expuesto en dos schemas, y
 * cada app pega al que le corresponde: el ERP trabaja dentro de un tenant, la
 * app de cuenta todavía no tiene ninguno cuando pide la ciudad de facturación.
 *
 * Se declaran acá y no como strings en cada pantalla para que nadie tenga que
 * acordarse de qué ruta va con qué scope: van juntos porque son un solo dato.
 */
export const CIUDAD_FUENTE = {
  /** Dentro del tenant activo (ERP). */
  erp: { endpoint: '/general/ciudad/seleccionar/', tenantScoped: true },
  /** Schema público, sin tenant (cuenta, onboarding). */
  contenedor: { endpoint: '/contenedor/ciudad/seleccionar/', tenantScoped: false },
} as const;

/** Fuente de ciudades: ruta + si la petición viaja con `X-Tenant`. */
export type CiudadFuente = (typeof CIUDAD_FUENTE)[keyof typeof CIUDAD_FUENTE];

@Injectable({ providedIn: 'root' })
export class CiudadService extends BaseHttpService {
  // El default es global; cada petición declara su scope vía la fuente.
  protected override readonly tenantScoped = false;

  search(query: string, fuente: CiudadFuente = CIUDAD_FUENTE.contenedor): Observable<Ciudad[]> {
    const params = query ? { search: query } : undefined;
    return this.get<PaginatedResponse<Ciudad>>(fuente.endpoint, params, {
      tenantScoped: fuente.tenantScoped,
    }).pipe(map((res) => [...res.results]));
  }
}
