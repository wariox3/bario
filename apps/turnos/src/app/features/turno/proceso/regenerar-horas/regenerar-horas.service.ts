import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { RegenerarHorasResult } from './regenerar-horas.model';

/** Endpoint del proceso: recalcula las horas de las líneas de documento del período. */
export const REGENERAR_HORAS_ENDPOINT = '/general/documento-detalle/regenerar-horas/';

/**
 * Servicio HTTP del proceso **Regenerar horas** (módulo Turno).
 *
 * Dispara un `POST { anio, mes }` que pide al backend recalcular las horas
 * (contratadas y programadas: total/diurnas/nocturnas) de las líneas de
 * `documento-detalle` del período — el insumo del grid de programación.
 *
 * `tenantScoped` queda en su default `true`: el endpoint vive en el schema del
 * tenant, igual que el resto de `/general/...`.
 */
@Injectable({ providedIn: 'root' })
export class RegenerarHorasService extends BaseHttpService {
  regenerar(anio: number, mes: number): Observable<RegenerarHorasResult> {
    return this.post<RegenerarHorasResult>(REGENERAR_HORAS_ENDPOINT, { anio, mes });
  }
}
