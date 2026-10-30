import { Injectable, inject } from '@angular/core';
import { type Observable, concatMap, map, of, shareReplay, tap } from 'rxjs';
import {
  BaseHttpService,
  SELECT_ENDPOINTS,
  TenantService,
  type ErpSelectOption,
  type PaginatedResponse,
} from '@reddoc/core';
import { CatalogoCobroError } from './cobro.model';

interface PlazoPagoFila {
  readonly id: number;
  readonly nombre: string;
  readonly dias?: number | null;
}

/** Red por si `next` viniera siempre lleno: no colgar el cobro en un bucle. */
const MAX_PAGINAS = 20;

/**
 * Resuelve contra el catálogo del tenant el **plazo de contado** que el documento
 * POS necesita (el POS anterior lo quemaba como `plazo_pago: 1`): el de 0 días,
 * porque una venta de caja se paga en el acto. El método de pago no se busca:
 * va fijo (`METODO_PAGO_POS_ID`).
 *
 * El `seleccionar/` pagina: se recorren páginas hasta la fila. Se recuerda por
 * tenant; un error no se recuerda.
 */
@Injectable({ providedIn: 'root' })
export class CatalogosCobroService extends BaseHttpService {
  private readonly tenant = inject(TenantService);

  private readonly cache = new Map<string, Observable<ErpSelectOption>>();

  plazoContado(): Observable<ErpSelectOption> {
    return this.recordar('plazo:contado', () =>
      this.buscar<PlazoPagoFila>(SELECT_ENDPOINTS.plazoPago, (f) => f.dias === 0).pipe(
        map((fila) => {
          if (!fila) throw new CatalogoCobroError('plazoContado');
          return { id: fila.id, nombre: fila.nombre };
        }),
      ),
    );
  }

  private recordar(
    clave: string,
    consultar: () => Observable<ErpSelectOption>,
  ): Observable<ErpSelectOption> {
    const llave = `${this.tenant.currentSlug() ?? ''}:${clave}`;
    const enCache = this.cache.get(llave);
    if (enCache) return enCache;
    const consulta = consultar().pipe(
      tap({ error: () => this.cache.delete(llave) }),
      shareReplay(1),
    );
    this.cache.set(llave, consulta);
    return consulta;
  }

  /** Primera fila que cumple `coincide`, recorriendo páginas; `null` si no está. */
  private buscar<T>(
    endpoint: string,
    coincide: (fila: T) => boolean,
    params: Record<string, string> = {},
    page = 1,
  ): Observable<T | null> {
    return this.get<PaginatedResponse<T>>(endpoint, { ...params, page }).pipe(
      concatMap((respuesta) => {
        const fila = (respuesta.results ?? []).find(coincide);
        if (fila) return of(fila);
        if (!respuesta.next || page >= MAX_PAGINAS) return of(null);
        return this.buscar(endpoint, coincide, params, page + 1);
      }),
    );
  }
}
