import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { AnaliticaHorasResponse } from './turno-inicio.model';

/**
 * Servicio de analítica del inicio de Turno.
 *
 * Consume `/general/documento/analitica-horas/` (GET con rango de fechas en
 * query params). Etapa 2 del rediseño de navegación: hoy solo se usa para
 * inspeccionar la respuesta del backend; cuando se confirme la forma se tipará
 * y se conectará a los KPIs/gráficos del inicio.
 */
@Injectable({ providedIn: 'root' })
export class TurnoInicioService extends BaseHttpService {
  private readonly resourcePath = '/general/documento/analitica-horas/';

  /** Analítica de horas en el rango `[fechaDesde, fechaHasta]` (AAAA-MM-DD). */
  analiticaHoras(fechaDesde: string, fechaHasta: string): Observable<AnaliticaHorasResponse> {
    return this.get<AnaliticaHorasResponse>(this.resourcePath, {
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
    });
  }
}
