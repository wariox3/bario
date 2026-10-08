import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
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

  /**
   * Resuelve una ciudad por id: la única forma de pintar una guardada, porque los
   * registros almacenan el id pelado y `seleccionar` **no tiene retrieve**.
   *
   * Se apoya en el filtro `id` de la lista. Si el backend todavía no lo declara,
   * DRF lo descarta **en silencio** y responde la primera página del catálogo
   * entero — el mismo modo de fallar que ya mordió con `ordering`. Por eso el
   * resultado solo se acepta cuando trae exactamente una fila y es la pedida:
   * con el filtro sin declarar devuelve `null` y quien llama degrada igual que si
   * no hubiera dato, en vez de pintar con aplomo la primera ciudad del catálogo.
   *
   * Nunca falla hacia afuera: un error de red o un 400 también caen en `null`, y
   * sin toast, porque no hay nada que la persona pueda hacer al respecto.
   */
  byId(id: number, fuente: CiudadFuente = CIUDAD_FUENTE.contenedor): Observable<Ciudad | null> {
    return this.get<PaginatedResponse<Ciudad>>(
      fuente.endpoint,
      { id },
      { tenantScoped: fuente.tenantScoped, errorToast: false },
    ).pipe(
      map((res) => (res.results.length === 1 && res.results[0].id === id ? res.results[0] : null)),
      catchError(() => of(null)),
    );
  }
}
