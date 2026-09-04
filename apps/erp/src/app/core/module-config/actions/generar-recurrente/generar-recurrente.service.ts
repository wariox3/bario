import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';

/**
 * Endpoint **genérico** de generación de documentos a partir de otro tipo.
 *
 * No existe un `generar-recurrente/` propio en el backend: generar facturas
 * desde plantillas recurrentes es un caso más de este endpoint (origen = el
 * tipo recurrente, destino = la factura real). Ver `general/documento/generar/`
 * en el OpenAPI (`/api/contenedor/schema/`).
 */
const GENERAR_ENDPOINT = '/general/documento/generar/';

/**
 * Payload de `POST /general/documento/generar/` para la variante recurrente.
 *
 * `documento_ids` es lo que distingue "generar seleccionados" de "generar
 * todos": presente limita la generación a las plantillas marcadas, **omitido**
 * el backend toma todas las del `documento_tipo_id`. Es opcional en el schema
 * (`GenDocumentoGenerarRequest`), por eso el campo es opcional acá también.
 *
 * `mes`/`anio` son requeridos por el backend siempre —son el período de los
 * documentos que se crean—, aunque se envíe una selección explícita. El backend
 * **no acepta filtros**: "todos" son todas las plantillas del tipo, no las que
 * la persona tenga filtradas en el listado.
 */
export interface GenerarRecurrentePayload {
  /** Tipo de las plantillas recurrentes (origen). */
  readonly documento_tipo_id: number;
  /** Tipo de la factura real que se crea (destino). */
  readonly documento_tipo_id_destino: number;
  /** Plantillas seleccionadas en el listado; omitido ⇒ todas las del tipo. */
  readonly documento_ids?: readonly number[];
  /** Mes del período a generar (1-12). */
  readonly mes: number;
  /** Año del período a generar. */
  readonly anio: number;
}

/** Respuesta de `POST /general/documento/generar/` (página de documentos creados). */
export interface GenerarRecurrenteResponse {
  readonly count: number;
  readonly results: readonly unknown[];
}

/**
 * Servicio HTTP de la acción "generar recurrente".
 *
 * Genera facturas reales a partir de las plantillas recurrentes seleccionadas.
 * `tenantScoped` queda en su default `true`: el endpoint vive en el schema del
 * tenant, igual que el resto del framework de documentos (`/general/...`).
 */
@Injectable({ providedIn: 'root' })
export class GenerarRecurrenteService extends BaseHttpService {
  generar(payload: GenerarRecurrentePayload): Observable<GenerarRecurrenteResponse> {
    return this.post<GenerarRecurrenteResponse>(GENERAR_ENDPOINT, payload);
  }
}
