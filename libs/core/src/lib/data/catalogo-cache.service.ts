import { Injectable, inject } from '@angular/core';
import { type Observable, catchError, shareReplay, throwError } from 'rxjs';
import type { ParamValue } from '../services/base-http.service';
import { TenantService } from '../tenant/tenant.service';

/**
 * Cuánto vive un catálogo en memoria. Corto a propósito: alcanza para que una
 * pantalla no pida cinco veces el mismo `seleccionar` (la cabecera, la tabla,
 * un modal) y para que un cambio hecho desde otra pestaña o por otra persona
 * aparezca sin recargar. Lo que se cambia desde esta pestaña no espera el TTL:
 * lo invalida `catalogoCacheInterceptor`.
 */
export const CATALOGO_TTL_MS = 30_000;

interface EntradaCatalogo {
  /** Recurso del catálogo (`/inventario/almacen/`): lo que una escritura invalida. */
  readonly recurso: string;
  readonly vence: number;
  readonly opciones$: Observable<unknown[]>;
}

/**
 * Recurso al que pertenece un `seleccionar`: el endpoint sin ese sufijo.
 * `/inventario/almacen/seleccionar/` → `/inventario/almacen/`, que es donde se
 * crea, edita y borra un almacén.
 */
export function recursoDeCatalogo(endpoint: string): string {
  return endpoint.replace(/seleccionar\/?$/, '');
}

/** Params en orden estable: `{ b, a }` y `{ a, b }` son el mismo catálogo. */
function claveParams(params: Record<string, ParamValue> | undefined): string {
  if (!params) return '';
  return Object.keys(params)
    .filter((k) => params[k] != null)
    .sort()
    .map((k) => `${k}=${String(params[k])}`)
    .join('&');
}

/**
 * Cache en memoria de los catálogos completos (`fetchAllOptions`).
 *
 * - Una consulta en vuelo se comparte: diez selects que piden el mismo catálogo
 *   a la vez generan una sola petición.
 * - La clave lleva el tenant: dos contenedores nunca comparten catálogo.
 * - Un error no se cachea: el próximo pedido vuelve a consultar.
 * - Una escritura exitosa al recurso (`POST/PUT/PATCH/DELETE`) lo invalida —
 *   lo hace `catalogoCacheInterceptor`—, así un ítem o un tercero recién creado
 *   desde un modal aparece en el siguiente select que se abra.
 *
 * No cachea las búsquedas de un autocomplete (`fetchOptions` con `search`):
 * cambian en cada tecla y no se repiten.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoCacheService {
  private readonly tenant = inject(TenantService);
  private readonly entradas = new Map<string, EntradaCatalogo>();

  /** Devuelve el catálogo vigente o lo trae con `consultar` y lo guarda. */
  obtener<T>(
    endpoint: string,
    params: Record<string, ParamValue> | undefined,
    consultar: () => Observable<T[]>,
  ): Observable<T[]> {
    const clave = `${this.tenant.currentSlug() ?? ''}|${endpoint}?${claveParams(params)}`;
    const ahora = Date.now();
    const vigente = this.entradas.get(clave);
    if (vigente && vigente.vence > ahora) return vigente.opciones$ as Observable<T[]>;

    const opciones$: Observable<T[]> = consultar().pipe(
      catchError((err: unknown) => {
        // Solo si sigue siendo esta entrada: pudo invalidarse y rehacerse mientras volaba.
        if (this.entradas.get(clave)?.opciones$ === opciones$) this.entradas.delete(clave);
        return throwError(() => err);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.entradas.set(clave, {
      recurso: recursoDeCatalogo(endpoint),
      vence: ahora + CATALOGO_TTL_MS,
      opciones$,
    });
    return opciones$;
  }

  /**
   * Descarta los catálogos del recurso al que apunta `url` (absoluta o
   * relativa a la API). `/api/inventario/almacen/12/` invalida
   * `/inventario/almacen/seleccionar/` con cualquier params.
   */
  invalidar(url: string): void {
    for (const [clave, entrada] of this.entradas) {
      if (url.includes(entrada.recurso)) this.entradas.delete(clave);
    }
  }

  /** Descarta todo el cache. */
  vaciar(): void {
    this.entradas.clear();
  }
}
