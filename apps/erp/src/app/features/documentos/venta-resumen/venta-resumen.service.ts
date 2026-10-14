import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { VentaPeriodo, VentaResumen } from './venta-resumen.model';

/** Endpoint de las cifras de ventas del inicio de General. */
export const VENTA_RESUMEN_ENDPOINT = '/general/documento/venta-resumen/';

/** Ventas del mes o del año en curso, con su serie por día o por mes. */
@Injectable({ providedIn: 'root' })
export class VentaResumenService extends BaseHttpService {
  obtener(periodo: VentaPeriodo): Observable<VentaResumen> {
    return this.get<VentaResumen>(VENTA_RESUMEN_ENDPOINT, { periodo });
  }
}
