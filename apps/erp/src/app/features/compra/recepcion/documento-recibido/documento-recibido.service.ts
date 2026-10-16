import { Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type {
  DocumentoRecibido,
  DocumentoRecibidoPagina,
  DocumentoRecibidoQuery,
} from './documento-recibido.model';

const BASE = '/general/electronico/';

/**
 * Recepción de documentos de proveedores en RedEDoc: la bandeja y la carga a
 * mano de un archivo que no llegó por el buzón.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoRecibidoService extends BaseHttpService {
  listar(query: DocumentoRecibidoQuery = {}): Observable<DocumentoRecibidoPagina> {
    return this.get<DocumentoRecibidoPagina>(`${BASE}recepcion-documento/`, { ...query });
  }

  /**
   * Un documento de la bandeja. El backend no tiene `GET` por id: se busca por
   * su CUE el día de emisión (el filtro de fechas es obligatorio en la práctica,
   * sin él consulta el mes en curso) y se toma el que coincide en id.
   */
  obtener(id: string, cue: string, fecha: string): Observable<DocumentoRecibido | null> {
    return this.listar({ search: cue, desde: fecha, hasta: fecha, page_size: 100 }).pipe(
      map((res) => res.results.find((doc) => doc.id === id) ?? null),
    );
  }

  /**
   * Sube un archivo del proveedor (multipart, campo `archivo`). Sin toast: la
   * ventana de carga muestra el error junto al archivo.
   */
  cargar(archivo: File): Observable<unknown> {
    return this.postFile<unknown>(
      `${BASE}recepcion-documento-cargar/`,
      archivo,
      undefined,
      'archivo',
      { errorToast: false },
    );
  }
}
