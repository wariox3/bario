import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type {
  ConfiguracionProvision,
  ConfiguracionProvisionPayload,
} from './configuracion-provision.model';

/**
 * Servicio HTTP de la configuración de provisiones.
 *
 * `configuracion/` devuelve todas las filas en un arreglo, sin paginar.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionProvisionService extends BaseHttpService {
  private readonly resourcePath = '/humano/configuracion-provision/';

  listar(): Observable<ConfiguracionProvision[]> {
    return this.get<ConfiguracionProvision[]>(`${this.resourcePath}configuracion/`);
  }

  /** Guarda la cuenta que cambió (débito o crédito). */
  update(id: number, payload: ConfiguracionProvisionPayload): Observable<unknown> {
    return this.patch<unknown>(`${this.resourcePath}${id}/`, payload);
  }
}
