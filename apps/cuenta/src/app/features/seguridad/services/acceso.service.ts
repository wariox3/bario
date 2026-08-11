import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService, PaginatedResponse } from '@reddoc/core';
import { AccesoRegistro } from '../models/acceso.model';

/** Registro de accesos a la cuenta: `GET /seguridad/acceso/`, sin parámetros. */
@Injectable({ providedIn: 'root' })
export class AccesoService extends BaseHttpService {
  /**
   * La primera página, que es la que se pinta: esta pantalla se consulta por lo reciente.
   * El `next` de la respuesta le dice a la vista que no está mostrando todo el historial.
   */
  listar(): Observable<PaginatedResponse<AccesoRegistro>> {
    return this.get<PaginatedResponse<AccesoRegistro>>('/seguridad/acceso/');
  }
}
