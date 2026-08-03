import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { ImportarZipResponse } from './importar-zip.model';

/** Endpoint de cabeceras de documento. */
const DOCUMENTO_ENDPOINT = '/general/documento/';

/** Respuesta de guardado de la factura. */
export interface GuardarFacturaResponse {
  readonly documento?: { readonly id?: number } | null;
}

/**
 * Servicio HTTP del wizard **Importar ZIP** (Eventos DIAN, Compra).
 *
 *  - `importarZip`: sube el ZIP en base64 y devuelve los datos parseados.
 *  - `guardarFactura`: crea la factura de compra (`nuevo/`).
 *  - `aprobar`: aprueba el documento recién creado.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 *
 * **Supuesto pendiente de confirmar con backend**: los tres paths siguen
 * vigentes en reddocapi.uk.
 */
@Injectable({ providedIn: 'root' })
export class ImportarZipService extends BaseHttpService {
  importarZip(archivoBase64: string): Observable<ImportarZipResponse> {
    return this.post<ImportarZipResponse>(`${DOCUMENTO_ENDPOINT}importar-zip-dian/`, {
      archivo_base64: archivoBase64,
    });
  }

  guardarFactura(payload: Record<string, unknown>): Observable<GuardarFacturaResponse> {
    return this.post<GuardarFacturaResponse>(`${DOCUMENTO_ENDPOINT}nuevo/`, payload);
  }

  aprobar(id: number): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}aprobar/`, { id });
  }
}

/**
 * Convierte un `File` a base64 **sin** el prefijo data-uri (`data:...;base64,`),
 * que es lo que espera `importar-zip-dian/`.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('No se pudo leer el archivo.'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}
