import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { CorreoRecibidoPagina, CorreoRecibidoQuery } from './correo-recibido.model';

/** Correos y cargas manuales que llegaron a la recepción del emisor en RedEDoc. */
@Injectable({ providedIn: 'root' })
export class CorreoRecibidoService extends BaseHttpService {
  listar(query: CorreoRecibidoQuery = {}): Observable<CorreoRecibidoPagina> {
    return this.get<CorreoRecibidoPagina>('/general/electronico/recepcion-correo/', { ...query });
  }
}
