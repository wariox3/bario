import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { BaseHttpService, FileDownloadService, type ParamValue } from '@reddoc/core';
import type { Archivo, ArchivoOwner } from './archivo.types';

/** Recurso de archivos adjuntos. Único para todo el ERP. */
const ARCHIVO_ENDPOINT = '/general/archivo/';

/**
 * Tipo de archivo (`gen_archivo_tipo`). Separa la galería de imágenes de un
 * registro de sus adjuntos: los dos cuelgan del mismo dueño y solo se
 * distinguen por acá.
 */
export const ARCHIVO_TIPO = {
  ADJUNTO: 1,
  IMAGEN: 2,
} as const;

/** Respuesta paginada del listado. */
interface ArchivoListResponse {
  readonly count: number;
  readonly results: readonly Archivo[];
}

/**
 * Archivos adjuntos de cualquier registro del ERP.
 *
 * A diferencia de la importación —donde cada master postea contra su propio
 * `<recurso>/importar/`— acá el endpoint es **uno solo para todo el ERP**, así
 * que las operaciones viven en un servicio compartido y ninguna pantalla las
 * repite.
 */
@Injectable({ providedIn: 'root' })
export class ArchivoService extends BaseHttpService {
  private readonly fileDownload = inject(FileDownloadService);

  /**
   * Archivos del dueño, acotados al tipo que administra quien pregunta: la
   * galería de imágenes de un ítem no debe listar sus adjuntos, ni al revés.
   *
   * Lee solo la **primera página**: los adjuntos de un registro son unos pocos,
   * y paginar dentro del diálogo costaría más de lo que resuelve. Si algún día
   * un registro acumula cientos, `count` ya está en la respuesta para detectarlo.
   */
  listar(owner: ArchivoOwner, archivoTipo: number): Observable<readonly Archivo[]> {
    return this.get<ArchivoListResponse>(ARCHIVO_ENDPOINT, {
      ...ownerParams(owner),
      archivo_tipo: archivoTipo,
    }).pipe(map((respuesta) => respuesta.results ?? []));
  }

  /**
   * Sube un archivo al registro.
   *
   * El `POST` es `multipart/form-data` con el contrato que definió el backend:
   * `archivo` (binario), `modelo` y `objeto_id` obligatorios —los mismos dos
   * campos con los que el listado filtra— y `archivo_tipo` opcional, que acá
   * siempre se manda para no dejar el archivo fuera de la galería o de los
   * adjuntos.
   */
  cargar(
    owner: ArchivoOwner,
    file: File,
    archivoTipo: number = ARCHIVO_TIPO.ADJUNTO,
  ): Observable<unknown> {
    return this.postFile<unknown>(ARCHIVO_ENDPOINT, file, {
      ...ownerParams(owner),
      archivo_tipo: archivoTipo,
    });
  }

  /**
   * Descarga el archivo por el endpoint del backend, no por `archivo.url`.
   *
   * `general/archivo/<id>/descargar/` es tenant-scoped y va con cookie, y un
   * `<a href>` no puede mandar la cabecera `X-Tenant`: la petición tiene que
   * pasar por `HttpClient`. `FileDownloadService` ya resuelve eso —blob +
   * `Content-Disposition`— y deja el nombre del archivo como fallback.
   */
  descargar(archivo: Archivo): Observable<void> {
    return this.fileDownload.download(`${ARCHIVO_ENDPOINT}${archivo.id}/descargar/`, {
      fallbackFilename: archivo.nombre,
    });
  }

  eliminar(id: number): Observable<void> {
    return this.delete<void>(`${ARCHIVO_ENDPOINT}${id}/`);
  }
}

/**
 * Traduce el dueño a los campos que entiende el backend. Es el único lugar del
 * ERP que conoce esos nombres: sirve de filtro en el listado y de campos del
 * multipart al cargar.
 */
function ownerParams(owner: ArchivoOwner): Record<string, ParamValue> {
  return { modelo: owner.modelo, objeto_id: String(owner.objetoId) };
}
