import { Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type {
  BalancePruebaParams,
  BalancePruebaResponse,
  BalancePruebaRow,
} from './balance-prueba.model';

/**
 * Endpoint del informe. El mismo path sirve las tres operaciones —consultar,
 * Excel y PDF— discriminadas por una bandera en el body.
 */
export const BALANCE_PRUEBA_ENDPOINT = '/contabilidad/movimiento/informe-balance-prueba/';

/**
 * Servicio HTTP del informe **Balance de prueba**.
 *
 * A diferencia de los listados del ERP (`POST …/lista/` con
 * `{ filtros, ordenamientos }` y paginación en query params), acá se manda un
 * `POST` con `{ parametros }` y el backend devuelve el balance **completo**.
 * Por eso no hay `ListQuery` ni `PaginatedResponse` en este archivo.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 *
 * **Supuestos pendientes de confirmar con backend**: el path, la forma del body
 * y que las descargas viajen como `excel: true` / `pdf: true` junto a los mismos
 * `parametros`.
 */
@Injectable({ providedIn: 'root' })
export class BalancePruebaService extends BaseHttpService {
  /** URL de las descargas (la usa `FileDownloadService`). */
  readonly exportUrl = BALANCE_PRUEBA_ENDPOINT;

  /** Genera el balance para los parámetros dados. */
  consultar(parametros: BalancePruebaParams): Observable<readonly BalancePruebaRow[]> {
    return this.post<BalancePruebaResponse>(BALANCE_PRUEBA_ENDPOINT, { parametros }).pipe(
      map((response) => response?.registros ?? []),
    );
  }
}
