import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService, FileDownloadService } from '@reddoc/core';
import type { RecepcionAdjuntoPagina, RecepcionAdjuntoQuery } from './recepcion-adjunto.model';

const BASE = '/general/electronico/recepcion/';

/** Archivos adjuntos de la recepción: el listado y su descarga. */
@Injectable({ providedIn: 'root' })
export class RecepcionAdjuntoService extends BaseHttpService {
  private readonly fileDownload = inject(FileDownloadService);

  listar(query: RecepcionAdjuntoQuery = {}): Observable<RecepcionAdjuntoPagina> {
    return this.get<RecepcionAdjuntoPagina>(`${BASE}adjunto/`, { ...query });
  }

  /** Baja el archivo con su nombre original (lo manda el backend en la cabecera). */
  descargar(id: string, nombre: string): Observable<void> {
    return this.fileDownload.download(`${BASE}adjunto-descargar/`, {
      params: { id },
      fallbackFilename: nombre,
    });
  }
}
