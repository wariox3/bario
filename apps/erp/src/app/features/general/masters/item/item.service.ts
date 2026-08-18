import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Item, ItemImportResult, ItemPayload } from './item.model';

/**
 * Servicio HTTP de items.
 *
 * Master administrativo del módulo General. Vive como feature directo
 * (camino B del enfoque híbrido — ver docs/architecture).
 *
 * Reutiliza `buildListBody` de `@reddoc/core` para enviar el body
 * `{ filtros, ordenamientos }`. La paginación va como query params
 * (`buildListParams`), que es donde el backend la lee.
 */
@Injectable({ providedIn: 'root' })
export class ItemService extends BaseHttpService {
  private readonly resourcePath = '/general/item/';

  list(query: ListQuery): Observable<PaginatedResponse<Item>> {
    return this.post<PaginatedResponse<Item>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Item> {
    return this.get<Item>(`${this.resourcePath}${id}/`);
  }

  create(payload: ItemPayload): Observable<Item> {
    return this.post<Item>(this.resourcePath, payload);
  }

  update(id: number, payload: ItemPayload): Observable<Item> {
    return this.put<Item>(`${this.resourcePath}${id}/`, payload);
  }

  /** Importación masiva desde un archivo Excel. */
  importar(file: File): Observable<ItemImportResult> {
    return this.postFile<ItemImportResult>(`${this.resourcePath}importar/`, file);
  }

  /**
   * Carga (o reemplaza) la imagen del item con un data-URL/base64 ya recortado.
   * TODO(backend): confirmar endpoint y payload en el API nuevo (reddocapi.uk).
   * Estimado a partir del legacy (`general/item/cargar-imagen/`).
   */
  cargarImagen(id: number, base64: string): Observable<{ mensaje?: string }> {
    return this.post<{ mensaje?: string }>(`${this.resourcePath}cargar-imagen/`, { id, base64 });
  }

  /**
   * Elimina la imagen del item.
   * TODO(backend): confirmar endpoint y payload en el API nuevo (reddocapi.uk).
   * Estimado a partir del legacy (`general/item/eliminar-imagen/`).
   */
  eliminarImagen(id: number): Observable<{ mensaje?: string }> {
    return this.post<{ mensaje?: string }>(`${this.resourcePath}eliminar-imagen/`, { id });
  }

  /**
   * Elimina uno o varios items.
   * El backend de masters no expone batch-delete, así que paralelizamos
   * DELETEs individuales con `forkJoin`.
   */
  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) {
      // forkJoin con array vacío completa sin emitir; usamos un Observable que
      // emite inmediatamente para mantener el contrato.
      return new Observable<void>((subscriber) => {
        subscriber.next();
        subscriber.complete();
      });
    }
    const deletions = ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }
}
