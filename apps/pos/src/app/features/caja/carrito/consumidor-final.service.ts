import { Injectable, inject } from '@angular/core';
import { type Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import {
  ErpSelectDataService,
  TenantService,
  buildContactoLabel,
  type ErpSelectOption,
} from '@reddoc/core';

const CONTACTO_SELECCIONAR = '/general/contacto/seleccionar/';

/** Identificación de "Consumidor final": solo doses (la DIAN usa 222222222222). */
const ES_CONSUMIDOR_FINAL = /^2+$/;

interface ContactoFila {
  readonly id: number;
  readonly nombre_corto?: string;
  readonly numero_identificacion?: string;
  readonly precio_id?: number | null;
}

/**
 * Resuelve el contacto "Consumidor final" del tenant, el cliente por defecto
 * de cada venta nueva.
 *
 * El POS anterior lo asumía con `id = 1`; aquí se busca por su identificación
 * (todo doses), así no depende de cómo se sembró cada tenant. Si no existe,
 * devuelve `null` y la venta arranca sin cliente. La respuesta se recuerda por
 * tenant; un error no se recuerda, para reintentar en la siguiente venta.
 */
@Injectable({ providedIn: 'root' })
export class ConsumidorFinalService {
  private readonly data = inject(ErpSelectDataService);
  private readonly tenant = inject(TenantService);

  private readonly cache = new Map<string, Observable<ErpSelectOption | null>>();

  resolver(): Observable<ErpSelectOption | null> {
    const slug = this.tenant.currentSlug();
    if (!slug) return of(null);
    const enCache = this.cache.get(slug);
    if (enCache) return enCache;

    const consulta = this.data
      .fetchOptions<ContactoFila>(CONTACTO_SELECCIONAR, { cliente: 'True', search: '2222222222' })
      .pipe(
        map((filas) => {
          const fila = filas.find((f) => ES_CONSUMIDOR_FINAL.test(f.numero_identificacion ?? ''));
          if (!fila) return null;
          const opcion: ErpSelectOption = {
            id: fila.id,
            nombre: buildContactoLabel(fila.numero_identificacion, fila.nombre_corto),
            ...(typeof fila.precio_id === 'number' ? { precio_id: fila.precio_id } : {}),
          };
          return opcion;
        }),
        tap({ error: () => this.cache.delete(slug) }),
        catchError(() => of(null)),
        shareReplay(1),
      );
    this.cache.set(slug, consulta);
    return consulta;
  }
}
