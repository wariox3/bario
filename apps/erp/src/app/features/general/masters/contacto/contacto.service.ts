import { Injectable } from '@angular/core';
import { Observable, delay, forkJoin, map, of } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import { environment } from '../../../../../environments/environment';
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
   * Si `existe` es `true`, devuelve nombre y correo para autocompletar el
   * formulario de alta.
   *
   * La consulta real solo responde en producción; fuera de ella se mockea con
   * `consultaDianMock`.
   */
  consultarDian(data: {
    identificacion_id: number;
    numero_identificacion: string;
  }): Observable<ConsultaDianResponse> {
    if (!environment.production) return consultaDianMock(data.numero_identificacion);
    return this.post<ConsultaDianResponse>(`${this.resourcePath}consulta-dian/`, data);
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

/**
 * Respuesta simulada de `consulta-dian/` para desarrollo: un número terminado en
 * `0` no existe; cualquier otro devuelve el ejemplo de la DIAN.
 */
function consultaDianMock(numero: string): Observable<ConsultaDianResponse> {
  const respuesta: ConsultaDianResponse = numero.endsWith('0')
    ? {
        existe: false,
        nombre: '',
        correo: '',
        codigo: '404',
        mensaje: 'El adquirente No existe en la base de datos',
      }
    : {
        existe: true,
        nombre: 'ALMACENES EXITO S A',
        correo: 'njudiciales@grupo-exito.com',
        codigo: '200',
        mensaje: '',
      };
  return of(respuesta).pipe(delay(600));
}
