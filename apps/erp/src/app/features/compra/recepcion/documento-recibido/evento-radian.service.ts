import { Injectable } from '@angular/core';
import { map, tap, type Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import { toEventosRadian, type EventoRadian, type EventoRadianQuery } from './evento-radian.model';

/** Eventos RADIAN que la empresa registró sobre los documentos recibidos. */
@Injectable({ providedIn: 'root' })
export class EventoRadianService extends BaseHttpService {
  listar(query: EventoRadianQuery = {}): Observable<readonly EventoRadian[]> {
    return this.get<unknown>('/recepcion/evento/', { ...query }).pipe(
      // TODO: quitar cuando se confirme la forma de la respuesta.
      tap((res) => console.log('[recepcion/evento]', JSON.stringify(res, null, 2))),
      map(toEventosRadian),
    );
  }
}
