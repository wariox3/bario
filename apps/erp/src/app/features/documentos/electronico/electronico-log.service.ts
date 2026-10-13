import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService, FileDownloadService } from '@reddoc/core';
import type { ElectronicoLogResponse } from './electronico-log.model';

const DOCUMENTO_ENDPOINT = '/general/documento/';

/**
 * Lo que se hace desde el modal **Información electrónica**: consultar el rastro
 * del documento (correos, eventos de entrega y validaciones DIAN), volver a
 * notificarlo al cliente y descargar su XML. Los tres son `POST` en el backend.
 */
@Injectable({ providedIn: 'root' })
export class ElectronicoLogService extends BaseHttpService {
  private readonly fileDownload = inject(FileDownloadService);

  consultar(documentoId: number): Observable<ElectronicoLogResponse> {
    return this.post<ElectronicoLogResponse>(`${DOCUMENTO_ENDPOINT}electronico-log/`, {
      id: documentoId,
    });
  }

  /**
   * Reenvía el documento por correo a su adquiriente. Sin el toast del
   * interceptor: el aviso lo da el modal, con el motivo del backend.
   */
  renotificar(documentoId: number): Observable<unknown> {
    return this.post<unknown>(
      `${DOCUMENTO_ENDPOINT}notificar/`,
      { ids: [documentoId] },
      undefined,
      { errorToast: false },
    );
  }

  /**
   * El XML firmado del documento. El nombre lo pone el backend (prefijo y
   * número); el respaldo es el id por si no expone `Content-Disposition`.
   */
  descargarXml(documentoId: number): Observable<void> {
    return this.fileDownload.download(`${DOCUMENTO_ENDPOINT}electronico-xml/`, {
      method: 'POST',
      body: { id: documentoId },
      fallbackFilename: `documento-${documentoId}.xml`,
      errorToast: false,
    });
  }
}
