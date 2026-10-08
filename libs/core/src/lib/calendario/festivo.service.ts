import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../services/base-http.service';

/** Festivo del calendario. `fecha` en formato ISO `YYYY-MM-DD`. */
export interface Festivo {
  readonly id: number;
  readonly fecha: string;
  readonly nombre: string;
}

/**
 * Servicio HTTP de festivos (catálogo del módulo general).
 *
 * Vive en `libs/core` porque lo consumen el calendario de turnos (`apps/turnos`) y
 * el modal de afectación (`apps/erp`): los festivos no viajan en la respuesta de
 * programación, así que quien pinte el calendario los pide aparte.
 */
@Injectable({ providedIn: 'root' })
export class FestivoService extends BaseHttpService {
  private readonly resourcePath = '/general/festivo/';

  /** Festivos de un mes: `GET /general/festivo/mes/?anio=<anio>&mes=<mes>`. */
  getDelMes(anio: number, mes: number): Observable<Festivo[]> {
    return this.get<Festivo[]>(`${this.resourcePath}mes/`, { anio, mes });
  }
}
