import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { ContratoResumen } from './contrato-resumen.model';

/** Endpoint de las cifras de contratos del inicio de Humano. */
export const CONTRATO_RESUMEN_ENDPOINT = '/humano/contrato/resumen/';

/** Cifras de contratos para la ficha del inicio de Humano. */
@Injectable({ providedIn: 'root' })
export class ContratoResumenService extends BaseHttpService {
  obtener(): Observable<ContratoResumen> {
    return this.get<ContratoResumen>(CONTRATO_RESUMEN_ENDPOINT);
  }
}
