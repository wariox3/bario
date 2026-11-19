import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService, type RequestOptions } from '../services/base-http.service';
import type {
  ConfiguracionUsuarioPayload,
  ConfiguracionUsuarioRead,
} from './configuracion-usuario.model';

/**
 * Servicio HTTP de la configuración del usuario autenticado.
 *
 * Siempre es la de quien hace la petición (el backend la resuelve por
 * `request.user`, nunca por parámetro). Es tenant-scoped: una fila por usuario
 * en cada contenedor. Para leerla desde un formulario se usa
 * `ConfiguracionUsuarioStore`, que la pide una sola vez.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionUsuarioService extends BaseHttpService {
  private readonly resourcePath = '/general/configuracion-usuario/';

  /** Trae la configuración; el backend la crea vacía en el primer acceso. */
  obtener(opts?: RequestOptions): Observable<ConfiguracionUsuarioRead> {
    return this.get<ConfiguracionUsuarioRead>(`${this.resourcePath}obtener/`, undefined, opts);
  }

  /** Actualización parcial: `null` quita el valor. Devuelve la configuración guardada. */
  actualizar(payload: ConfiguracionUsuarioPayload): Observable<ConfiguracionUsuarioRead> {
    return this.patch<ConfiguracionUsuarioRead>(`${this.resourcePath}actualizar/`, payload);
  }
}
