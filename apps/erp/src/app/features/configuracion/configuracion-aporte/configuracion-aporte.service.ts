import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { ConfiguracionAporte, ConfiguracionAportePayload } from './configuracion-aporte.model';

/**
 * Servicio HTTP de la configuración de aportes.
 *
 * `configuracion/` devuelve todas las filas en un arreglo, sin paginar: son
 * pocas y fijas.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionAporteService extends BaseHttpService {
  private readonly resourcePath = '/humano/configuracion-aporte/';

  listar(): Observable<ConfiguracionAporte[]> {
    return this.get<ConfiguracionAporte[]>(`${this.resourcePath}configuracion/`);
  }

  /** Asigna (o quita, con `null`) la cuenta contable del aporte. */
  update(id: number, payload: ConfiguracionAportePayload): Observable<unknown> {
    return this.patch<unknown>(`${this.resourcePath}${id}/`, payload);
  }
}
