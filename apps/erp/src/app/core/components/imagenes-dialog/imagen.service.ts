import { Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { BaseHttpService, type ParamValue } from '@reddoc/core';
import type { ArchivoOwner } from '../archivos-dialog/archivo.types';
import type { Imagen } from './imagen.types';

/** Recurso de imágenes. Único para todo el ERP. */
const IMAGEN_ENDPOINT = '/general/imagen/';

/** Respuesta paginada del listado. */
interface ImagenListResponse {
  readonly count: number;
  readonly results: readonly Imagen[];
}

/**
 * Imágenes de cualquier registro del ERP (hoy, los ítems).
 *
 * Es un recurso aparte de `general/archivo/`: cada registro tiene una galería
 * con **una** imagen principal, que el backend expone ya resuelta en el propio
 * registro (`imagen_principal_url`). Al dueño se lo identifica igual que en los
 * adjuntos —modelo + id—, así que se reusa `ArchivoOwner`.
 */
@Injectable({ providedIn: 'root' })
export class ImagenService extends BaseHttpService {
  /**
   * Imágenes del dueño, la principal primero (el orden lo da el backend).
   *
   * Lee solo la **primera página**, igual que los adjuntos: un registro tiene
   * unas pocas fotos y paginar dentro del diálogo costaría más de lo que resuelve.
   */
  listar(owner: ArchivoOwner): Observable<readonly Imagen[]> {
    return this.get<ImagenListResponse>(IMAGEN_ENDPOINT, ownerParams(owner)).pipe(
      map((respuesta) => respuesta.results ?? []),
    );
  }

  /** Sube una imagen al registro. Multipart: `imagen`, `modelo` y `objeto_id`. */
  cargar(owner: ArchivoOwner, file: File): Observable<Imagen> {
    return this.postFile<Imagen>(IMAGEN_ENDPOINT, file, ownerParams(owner), 'imagen');
  }

  /** La deja como principal de su registro; la que lo era deja de serlo. */
  marcarPrincipal(id: number): Observable<Imagen> {
    return this.post<Imagen>(`${IMAGEN_ENDPOINT}${id}/principal/`, {});
  }

  /** Borra la imagen del almacenamiento y de la base. */
  eliminar(id: number): Observable<void> {
    return this.delete<void>(`${IMAGEN_ENDPOINT}${id}/`);
  }
}

/** Traduce el dueño a los campos del backend: filtro del listado y campos del multipart. */
function ownerParams(owner: ArchivoOwner): Record<string, ParamValue> {
  return { modelo: owner.modelo, objeto_id: String(owner.objetoId) };
}
