import { Injectable } from '@angular/core';
import { tap, type Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { EventoRadianPagina, EventoRadianQuery } from './evento-radian.model';

/** Eventos RADIAN que la empresa registró sobre los documentos recibidos. */
@Injectable({ providedIn: 'root' })
export class EventoRadianService extends BaseHttpService {
  listar(query: EventoRadianQuery = {}): Observable<EventoRadianPagina> {
    return this.get<EventoRadianPagina>('/general/electronico/recepcion/evento/', {
      ...query,
    }).pipe(
      // TODO: quitar cuando se confirme la forma de cada evento.
      tap((res) => console.log('[recepcion/evento]', JSON.stringify(res, null, 2))),
    );
  }
}
