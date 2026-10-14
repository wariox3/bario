import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { ResumenPeriodo } from '@erp/features/documentos/resumen-periodo/resumen-periodo';
import type { ResultadoResumen } from './resultado-resumen.model';

export const RESULTADO_RESUMEN_ENDPOINT = '/general/documento/resultado-resumen/';

/** Ingresos contra egresos del mes o del año en curso, por día o por mes. */
@Injectable({ providedIn: 'root' })
export class ResultadoResumenService extends BaseHttpService {
  obtener(periodo: ResumenPeriodo): Observable<ResultadoResumen> {
    return this.get<ResultadoResumen>(RESULTADO_RESUMEN_ENDPOINT, { periodo });
  }
}
