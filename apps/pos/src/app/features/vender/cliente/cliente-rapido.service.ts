import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { ClienteCreado, ClienteRapidoPayload } from './cliente-rapido.model';

const CONTACTO = '/general/contacto/';

/** Alta de clientes desde la caja (el CRUD completo vive en el ERP). */
@Injectable({ providedIn: 'root' })
export class ClienteRapidoService extends BaseHttpService {
  crear(payload: ClienteRapidoPayload): Observable<ClienteCreado> {
    return this.post<ClienteCreado>(CONTACTO, payload);
  }

  /** ¿Ya existe un contacto con ese tipo y número de identificación? */
  validar(data: {
    readonly identificacion_id: number;
    readonly numero_identificacion: string;
  }): Observable<{ readonly existe: boolean }> {
    return this.post<{ readonly existe: boolean }>(`${CONTACTO}validar/`, data);
  }
}
