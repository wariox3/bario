import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { CarteraTipo } from '@erp/core/module-config';
import type { CarteraResumen } from './cartera-resumen.model';

/** Endpoint de las cifras del tablero de cartera. */
export const CARTERA_RESUMEN_ENDPOINT = '/general/documento/cartera-resumen/';

/**
 * Cifras del tablero de cuentas por cobrar (`cobrar`, inicio de Cartera) o por
 * pagar (`pagar`, inicio de Tesorería). Mismos documentos que los informes de
 * pendientes.
 */
@Injectable({ providedIn: 'root' })
export class CarteraResumenService extends BaseHttpService {
  obtener(tipo: CarteraTipo): Observable<CarteraResumen> {
    return this.get<CarteraResumen>(CARTERA_RESUMEN_ENDPOINT, { tipo });
  }
}
