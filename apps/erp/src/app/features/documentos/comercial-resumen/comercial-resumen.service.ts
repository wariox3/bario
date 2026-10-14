import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { ResumenPeriodo } from '../resumen-periodo/resumen-periodo';
import type { ComercialResumen, ComercialTipo } from './comercial-resumen.model';

/** Endpoint de cada resumen; misma respuesta en los dos. */
export const COMERCIAL_RESUMEN_ENDPOINT = {
  venta: '/general/documento/venta-resumen/',
  compra: '/general/documento/compra-resumen/',
} as const satisfies Record<ComercialTipo, string>;

/** Ventas o compras del mes o del año en curso, con su serie por día o por mes. */
@Injectable({ providedIn: 'root' })
export class ComercialResumenService extends BaseHttpService {
  obtener(tipo: ComercialTipo, periodo: ResumenPeriodo): Observable<ComercialResumen> {
    return this.get<ComercialResumen>(COMERCIAL_RESUMEN_ENDPOINT[tipo], { periodo });
  }
}
