import { map, type Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { InformeContableResponse, InformeCuentasParams } from './informe-cuentas.types';

/**
 * Base de los servicios de informes contables.
 *
 * A diferencia de los listados del ERP (`POST …/lista/` con
 * `{ filtros, ordenamientos }` y paginación en query params), acá se manda un
 * `POST` con `{ parametros }` y el backend devuelve el informe **completo**.
 * Por eso no hay `ListQuery` ni `PaginatedResponse` en esta familia.
 *
 * Cada informe solo declara su `endpoint`; el mismo path sirve las tres
 * operaciones —consultar, Excel y PDF— discriminadas por una bandera en el body
 * (las descargas las dispara la página con `FileDownloadService`).
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 *
 * **Supuestos pendientes de confirmar con backend**: la forma del body y que las
 * descargas viajen como `excel: true` / `pdf: true` junto a los mismos
 * `parametros`.
 */
export abstract class InformeCuentasService<
  TRow,
  TParams extends InformeCuentasParams = InformeCuentasParams,
> extends BaseHttpService {
  /** Path del informe, p. ej. `/contabilidad/movimiento/informe-balance-prueba/`. */
  protected abstract readonly endpoint: string;

  /** URL de las descargas (la usa `FileDownloadService`). */
  get exportUrl(): string {
    return this.endpoint;
  }

  /** Genera el informe para los parámetros dados. */
  consultar(parametros: TParams): Observable<readonly TRow[]> {
    return this.post<InformeContableResponse<TRow>>(this.endpoint, { parametros }).pipe(
      map((response) => response?.registros ?? []),
    );
  }
}
