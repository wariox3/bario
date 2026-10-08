import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Item, ItemPayload } from './item.model';

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

  /**
   * ¿El ítem ya se movió en documentos?
   *
   * Lo consulta el formulario en edición para bloquear lo que ya no se puede
   * cambiar: el tipo (producto/servicio) y el manejo de inventario. No es una
   * regla cosmética — un ítem con movimientos que pasa a servicio deja su kardex
   * colgando de algo que ya no maneja existencias, y desde el front no hay forma
   * de recomponerlo.
   *
   * `GET /general/item/{id}/validar-uso/` → `{ uso: boolean }`
   * (operación `general_item_validar_uso_retrieve` del schema del contenedor).
   */
  validarUso(id: number): Observable<boolean> {
    return this.get<{ uso: boolean }>(`${this.resourcePath}${id}/validar-uso/`).pipe(
      map((respuesta) => respuesta.uso),
    );
  }

  /** Importación masiva desde un archivo Excel. */
  importar(file: File): Observable<unknown> {
    return this.postFile<unknown>(`${this.resourcePath}importar/`, file);
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
