import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';

/** Endpoint de cabeceras de documento (compartido por todos los documentos). */
const DOCUMENTO_ENDPOINT = '/general/documento/';

/**
 * Lectura de **cabeceras de documento** (`/api/general/documento/`).
 *
 * Agnóstico del tipo de documento: complementa al `ENTITY_DATA_GATEWAY` (que
 * necesita un `EntityConfig`) para los puntos que solo tienen el id del
 * documento —p. ej. el modal de afectación, que a partir de una línea necesita
 * el `documento_tipo_nombre` de su documento—. El tipo de lectura se parametriza
 * por llamada.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoService extends BaseHttpService {
  /** Trae la cabecera de un documento por su `id` (`GET …documento/<id>/`). */
  obtenerPorId<TRead = unknown>(id: number): Observable<TRead> {
    return this.get<TRead>(`${DOCUMENTO_ENDPOINT}${id}/`);
  }
}
