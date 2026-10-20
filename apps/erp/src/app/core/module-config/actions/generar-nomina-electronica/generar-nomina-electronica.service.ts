import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService, DOCUMENT_TYPE_ID } from '@reddoc/core';

/**
 * Endpoint genérico de generación de documentos. Es el mismo que usa la acción
 * "generar" de venta, pero con otro contrato: acá el tipo va en `documento_tipo`
 * (sin `_id` ni destino) y el backend consolida las nóminas del periodo en
 * documentos de ese tipo.
 */
const GENERAR_ENDPOINT = '/general/documento/generar/';

/** El periodo a consolidar. `mes` es 1-12. */
export interface GenerarNominaElectronicaPeriodo {
  readonly anio: number;
  readonly mes: number;
}

/** Body de `POST /general/documento/generar/` para nómina electrónica. */
interface GenerarNominaElectronicaPayload extends GenerarNominaElectronicaPeriodo {
  readonly documento_tipo: number;
}

/**
 * Respuesta del backend.
 *
 * **Supuesto pendiente de confirmar**: `resumen` es lo único que devuelve, y el
 * ERP anterior lo ignora por completo. Si resulta ser "cuántas nóminas
 * electrónicas se generaron", vale la pena decirlo en el toast; si es un id, no.
 * Hasta saberlo se trata como opaco. Ver `PENDIENTES §7`.
 */
export interface GenerarNominaElectronicaRespuesta {
  readonly resumen?: number | null;
}

/**
 * Servicio HTTP de la acción "generar nómina electrónica".
 *
 * `tenantScoped` queda en su default `true`: el endpoint vive en el schema del
 * tenant, igual que el resto del framework de documentos (`/general/...`).
 */
@Injectable({ providedIn: 'root' })
export class GenerarNominaElectronicaService extends BaseHttpService {
  generar(periodo: GenerarNominaElectronicaPeriodo): Observable<GenerarNominaElectronicaRespuesta> {
    const payload: GenerarNominaElectronicaPayload = {
      documento_tipo: DOCUMENT_TYPE_ID.NOMINA_ELECTRONICA,
      ...periodo,
    };
    return this.post<GenerarNominaElectronicaRespuesta>(GENERAR_ENDPOINT, payload);
  }
}
