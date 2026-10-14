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

interface MetodoPagoFila {
  readonly id: number;
  readonly nombre: string;
  readonly codigo?: string | null;
}

interface PlazoPagoFila {
  readonly id: number;
  readonly nombre: string;
  readonly dias?: number | null;
}

/** Red por si `next` viniera siempre lleno: no colgar el cobro en un bucle. */
const MAX_PAGINAS = 20;

/**
 * Resuelve contra los catálogos del tenant lo que el documento POS necesita y
 * el POS anterior quemaba (`metodo_pago: 10`, `plazo_pago: 1`):
 *
 * - el **método de pago** por su código DIAN (`10` es efectivo);
 * - el **plazo de contado**, el de 0 días: una venta de caja se paga en el acto.
 *
 * Los `seleccionar/` paginan y el catálogo DIAN de métodos es largo, así que se
 * recorren páginas hasta encontrarlo. Se recuerda por tenant y código; un error
 * no se recuerda.
 */
@Injectable({ providedIn: 'root' })
export class CatalogosCobroService extends BaseHttpService {
  private readonly tenant = inject(TenantService);

  private readonly cache = new Map<string, Observable<ErpSelectOption>>();

  metodoPago(codigoDian: string): Observable<ErpSelectOption> {
    return this.recordar(`metodo:${codigoDian}`, () =>
      this.buscar<MetodoPagoFila>(
        SELECT_ENDPOINTS.metodoPago,
        (f) => f.codigo === codigoDian,
        1,
      ).pipe(
        map((fila) => {
          if (!fila) throw new CatalogoCobroError('metodoPago');
          return { id: fila.id, nombre: fila.nombre };
        }),
      ),
    );
  }

  plazoContado(): Observable<ErpSelectOption> {
    return this.recordar('plazo:contado', () =>
      this.buscar<PlazoPagoFila>(SELECT_ENDPOINTS.plazoPago, (f) => f.dias === 0, 1).pipe(
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
    page: number,
  ): Observable<T | null> {
    return this.get<PaginatedResponse<T>>(endpoint, { page }).pipe(
      concatMap((respuesta) => {
        const fila = (respuesta.results ?? []).find(coincide);
        if (fila) return of(fila);
        if (!respuesta.next || page >= MAX_PAGINAS) return of(null);
        return this.buscar(endpoint, coincide, page + 1);
      }),
    );
  }
}
