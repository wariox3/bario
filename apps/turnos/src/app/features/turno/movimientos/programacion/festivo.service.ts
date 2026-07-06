import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';

/** Festivo del calendario. `fecha` en formato ISO `YYYY-MM-DD`. */
export interface Festivo {
  readonly id: number;
  readonly fecha: string;
  readonly nombre: string;
}

/**
 * Servicio HTTP de festivos (catálogo del módulo general).
 */
@Injectable({ providedIn: 'root' })
export class FestivoService extends BaseHttpService {
  private readonly resourcePath = '/general/festivo/';

  /** Festivos de un mes: `GET /general/festivo/mes/?anio=<anio>&mes=<mes>`. */
  getDelMes(anio: number, mes: number): Observable<Festivo[]> {
    return this.get<Festivo[]>(`${this.resourcePath}mes/`, { anio, mes });
  }
}
