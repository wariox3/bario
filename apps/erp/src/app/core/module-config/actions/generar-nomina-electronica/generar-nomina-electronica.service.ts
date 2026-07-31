import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';

/**
 * Endpoint de generación de nóminas electrónicas.
 *
 * Va con **guion**, que es la convención de endpoints de este ERP; el ERP
 * anterior lo escribe igual (`generar-nomina-electronica/`), así que acá no hay
 * traducción de por medio.
 */
const GENERAR_NOMINA_ELECTRONICA_ENDPOINT = '/general/documento/generar-nomina-electronica/';

/** Payload: el periodo a consolidar. `mes` es 1-12. */
export interface GenerarNominaElectronicaPayload {
  readonly anio: number;
  readonly mes: number;
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
  generar(payload: GenerarNominaElectronicaPayload): Observable<GenerarNominaElectronicaRespuesta> {
    return this.post<GenerarNominaElectronicaRespuesta>(
      GENERAR_NOMINA_ELECTRONICA_ENDPOINT,
      payload,
    );
  }
}
