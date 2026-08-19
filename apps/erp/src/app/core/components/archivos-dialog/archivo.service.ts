import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { BaseHttpService, FileDownloadService, type ParamValue } from '@reddoc/core';
import type { Archivo, ArchivoOwner } from './archivo.types';

/** Recurso de archivos adjuntos. Único para todo el ERP. */
const ARCHIVO_ENDPOINT = '/general/archivo/';

/**
 * Tipo de archivo del backend. El ERP anterior distinguía `1` (adjunto de
 * cualquier extensión) de `2` (imagen, restringida a png/jpg/jpeg). Todo lo que
 * hoy usa este servicio es tipo 1; el parámetro queda expuesto para cuando la
 * galería de imágenes del ítem se porte.
 */
export const ARCHIVO_TIPO = {
  ADJUNTO: 1,
  IMAGEN: 2,
} as const;

/** Respuesta paginada de `general/archivo/`. */
interface ArchivoListResponse {
  readonly results: readonly Archivo[];
}

/**
 * Archivos adjuntos de un documento o de un registro de master.
 *
 * A diferencia de la importación —donde cada master postea contra su propio
 * `<recurso>/importar/`— acá el endpoint es **uno solo para todo el ERP**, así
 * que las cuatro operaciones viven en un servicio compartido y ninguna pantalla
 * las repite.
 *
 * **Supuestos pendientes de confirmar con backend** (portados del ERP anterior,
 * que pega contra estos mismos paths):
 *  - `GET general/archivo/` filtra por `documento_id` o por `codigo` + `modelo`,
 *    y responde `{ results }`.
 *  - `POST general/archivo/cargar/` acepta **multipart** con el archivo en el
 *    campo `archivo` (el ERP anterior manda `archivo_base64`; se adopta la
 *    convención multipart del backend nuevo, la misma de los `importar/`).
 *  - `POST general/archivo/descargar/` con `{ id }` responde el binario.
 */
@Injectable({ providedIn: 'root' })
export class ArchivoService extends BaseHttpService {
  private readonly fileDownload = inject(FileDownloadService);

  /**
   * Archivos del dueño, acotados al tipo que administra quien pregunta: la
   * galería de imágenes de un ítem no debe listar sus adjuntos, ni al revés.
   *
   * **Supuesto**: que `general/archivo/` filtre por `archivo_tipo_id`. El ERP
   * anterior no lo pedía —cada modelo tenía un solo punto de carga, así que la
   * lista no se mezclaba— y si el backend ignora el parámetro, el diálogo
   * muestra todos los archivos del registro en vez de solo los suyos.
   */
  listar(owner: ArchivoOwner, archivoTipoId: number): Observable<readonly Archivo[]> {
    return this.get<ArchivoListResponse>(ARCHIVO_ENDPOINT, {
      ...ownerParams(owner),
      archivo_tipo_id: archivoTipoId,
    }).pipe(map((response) => response.results ?? []));
  }

  cargar(
    owner: ArchivoOwner,
    file: File,
    archivoTipoId: number = ARCHIVO_TIPO.ADJUNTO,
  ): Observable<unknown> {
    return this.postFile<unknown>(`${ARCHIVO_ENDPOINT}cargar/`, file, {
      ...ownerParams(owner),
      archivo_tipo_id: archivoTipoId,
    });
  }

  /**
   * Dispara la descarga en el navegador. Va por `FileDownloadService` porque el
   * contrato es binario: el nombre sale del `Content-Disposition` y, si el
   * backend no lo manda, del nombre que ya conocemos.
   */
  descargar(archivo: Archivo): Observable<void> {
    return this.fileDownload.download(`${ARCHIVO_ENDPOINT}descargar/`, {
      method: 'POST',
      body: { id: archivo.id },
      fallbackFilename: archivo.nombre,
    });
  }

  eliminar(id: number): Observable<void> {
    return this.delete<void>(`${ARCHIVO_ENDPOINT}${id}/`);
  }
}

/**
 * Traduce el dueño a los campos que entiende el backend. Es el único lugar del
 * ERP que conoce esos nombres: sirve tanto de filtro en el listado como de
 * campos del multipart al cargar.
 */
function ownerParams(owner: ArchivoOwner): Record<string, ParamValue> {
  return owner.kind === 'documento'
    ? { documento_id: owner.documentoId }
    : { modelo: owner.modelo, codigo: owner.codigo };
}
