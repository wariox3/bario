import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { ConsultaDianResponse, Contacto, ContactoPayload } from './contacto.model';

/**
 * Servicio HTTP de contactos.
 *
 * Master administrativo del módulo General. Vive como feature directo
 * (camino B del enfoque híbrido — ver docs/architecture).
 *
 * Reutiliza `buildListBody` de `@reddoc/core` para enviar el body
 * `{ filtros, ordenamientos }`. La paginación va como query params
 * (`buildListParams`), que es donde el backend la lee.
 */
@Injectable({ providedIn: 'root' })
export class ContactoService extends BaseHttpService {
  private readonly resourcePath = '/general/contacto/';

  list(query: ListQuery): Observable<PaginatedResponse<Contacto>> {
    return this.post<PaginatedResponse<Contacto>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Contacto> {
    return this.get<Contacto>(`${this.resourcePath}${id}/`);
  }

  create(payload: ContactoPayload): Observable<Contacto> {
    return this.post<Contacto>(this.resourcePath, payload);
  }

  update(id: number, payload: ContactoPayload): Observable<Contacto> {
    return this.put<Contacto>(`${this.resourcePath}${id}/`, payload);
  }

  /**
   * Pregunta al backend si la combinación tipo de identificación + número
   * ya existe en otro contacto. Respuesta: `existe: true` ⇒ ya existe.
   */
  validar(data: {
    identificacion_id: number;
    numero_identificacion: string;
  }): Observable<{ existe: boolean }> {
    return this.post<{ existe: boolean }>(`${this.resourcePath}validar/`, data);
  }

  /**
   * Consulta el registro de la DIAN por tipo + número de identificación.
   * Si `encontrado` es `true`, devuelve nombre y correo para autocompletar el
   * formulario de alta.
   */
  consultarDian(params: {
    identificacion_id: number;
    numero_identificacion: string;
  }): Observable<ConsultaDianResponse> {
    return this.get<ConsultaDianResponse>(`${this.resourcePath}consulta-dian/`, params);
  }

  /** Importación masiva desde un archivo Excel. */
  importar(file: File): Observable<unknown> {
    return this.postFile<unknown>(`${this.resourcePath}importar/`, file);
  }

  /**
   * Elimina uno o varios contactos.
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
