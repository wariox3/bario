import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { DocumentoRecibidoPagina, DocumentoRecibidoQuery } from './documento-recibido.model';

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
