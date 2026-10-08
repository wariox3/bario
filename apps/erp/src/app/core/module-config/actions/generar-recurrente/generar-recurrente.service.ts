import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';

/**
 * Endpoint de generación desde **plantillas recurrentes**.
 *
 * Reemplaza al genérico `general/documento/generar/`, que el backend marcó
 * obsoleto: este resuelve solo qué hacer con cada plantilla según su tipo
 * (16/32 se copian enteras y se emiten con fecha de hoy; 34, contrato de
 * servicio, recorta sus detalles a la ventana del período). Ver
 * `general/documento/generar-recurrente/` en el OpenAPI
 * (`/api/contenedor/schema/`).
 */
const GENERAR_RECURRENTE_ENDPOINT = '/general/documento/generar-recurrente/';

/**
 * Payload de `POST /general/documento/generar-recurrente/`.
 *
 * Las plantillas se eligen con `documento_tipo_origen` (todas las de ese tipo),
 * con `documento_ids`, o con los dos a la vez —los ids acotan la selección del
 * tipo—; hay que mandar al menos uno. De ahí que "generar todos" mande el tipo
 * con `documento_ids` vacío y "generar seleccionados" mande los dos.
 *
 * `mes`/`anio` son el período de los documentos que se crean. Los tipos
 * recurrentes comerciales (16 y 32) los ignoran —nacen con fecha de hoy y
 * vencen a los días del plazo de pago del origen—, pero el contrato de servicio
 * (34) los necesita para recortar sus detalles.
 *
 * El backend **no acepta filtros**: sin `documento_ids`, "todos" son todas las
 * plantillas del tipo, no las que la persona tenga filtradas en el listado.
 */
export interface GenerarRecurrentePayload {
  /** Tipo de las plantillas recurrentes (origen). */
  readonly documento_tipo_origen: number;
  /** Tipo del documento real que se crea (destino). */
  readonly documento_tipo_destino: number;
  /** Plantillas seleccionadas en el listado; vacío ⇒ todas las del tipo. */
  readonly documento_ids: readonly number[];
  readonly mes: number;
  readonly anio: number;
}

/**
 * Respuesta de `POST /general/documento/generar-recurrente/`: la cantidad de
 * documentos creados. Es una sola transacción —si uno falla no se crea
 * ninguno—, así que `generados` es todo o nada.
 */
export interface GenerarRecurrenteResponse {
  readonly generados: number;
}

/**
 * Servicio HTTP de la acción "generar recurrente".
 *
 * Genera documentos reales a partir de las plantillas recurrentes.
 * `tenantScoped` queda en su default `true`: el endpoint vive en el schema del
 * tenant, igual que el resto del framework de documentos (`/general/...`).
 */
@Injectable({ providedIn: 'root' })
export class GenerarRecurrenteService extends BaseHttpService {
  generar(payload: GenerarRecurrentePayload): Observable<GenerarRecurrenteResponse> {
    return this.post<GenerarRecurrenteResponse>(GENERAR_RECURRENTE_ENDPOINT, payload);
  }
}
