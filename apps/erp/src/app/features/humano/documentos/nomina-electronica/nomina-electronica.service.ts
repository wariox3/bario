import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import {
  BaseHttpService,
  fetchAllPages,
  type BackendFilter,
  type PaginatedResponse,
} from '@reddoc/core';
import type {
  NominaElectronicaDetalleRead,
  NominaElectronicaOrigen,
} from './nomina-electronica.model';

/** Listado filtrado de cabeceras de documento (compartido por toda la familia). */
const DOCUMENTO_LISTA_ENDPOINT = '/general/documento/lista/';

/** Listado filtrado de líneas de documento. Va con **guion**, no con guion bajo. */
const DOCUMENTO_DETALLE_LISTA_ENDPOINT = '/general/documento-detalle/lista/';

/**
 * Las dos consultas de la ficha de **nómina electrónica** que el framework de
 * documentos no cubre.
 *
 * Todo lo demás —cabecera, aprobar, desaprobar, anular, emitir, imprimir— sale
 * del `ENTITY_DATA_GATEWAY`. Acá viven solo las dos lecturas propias de este
 * documento:
 *
 *  - `listarOrigen`: las nóminas que componen el consolidado. Es una consulta
 *    **hacia atrás** (`documento_referencia_id`) que no existe en el gateway
 *    porque ningún otro documento del ERP la necesita todavía.
 *  - `listarDetalle`: las líneas **de esas nóminas**, no las de la nómina
 *    electrónica. Salta un nivel: filtra las líneas cuyo documento apunta a
 *    este consolidado. El legacy manda además un `serializador` acá; se deja el
 *    punto de extensión abierto en un solo lugar.
 *
 * Las dos van por `POST …/lista/` con `filtros`, como los listados, y recorren
 * todas las páginas: la ficha muestra el consolidado completo.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class NominaElectronicaService extends BaseHttpService {
  /**
   * Trae las nóminas que apuntan a este consolidado: `POST documento/lista/`
   * filtrando por `documento_referencia_id`. El legacy pedía además
   * `serializador=lista_nomina`; acá se omite, igual que en la cabecera. Ver
   * `PENDIENTES §7`.
   */
  listarOrigen(documentoId: number): Observable<NominaElectronicaOrigen[]> {
    return this.listar<NominaElectronicaOrigen>(DOCUMENTO_LISTA_ENDPOINT, [
      { propiedad: 'documento_referencia_id', operador: '=', valor: documentoId },
    ]);
  }

  /**
   * Trae las líneas de las nóminas origen: `POST documento-detalle/lista/`
   * filtrando por el `documento_referencia_id` **del documento de la línea**.
   *
   * Confirmado con una respuesta real (2026-10-20): trae solo las líneas de
   * los documentos que apuntan a este consolidado.
   */
  listarDetalle(documentoId: number): Observable<NominaElectronicaDetalleRead[]> {
    return this.listar<NominaElectronicaDetalleRead>(DOCUMENTO_DETALLE_LISTA_ENDPOINT, [
      { propiedad: 'documento__documento_referencia_id', operador: '=', valor: documentoId },
    ]);
  }

  private listar<TRead>(endpoint: string, filtros: readonly BackendFilter[]): Observable<TRead[]> {
    return fetchAllPages((page) =>
      this.post<PaginatedResponse<TRead>>(endpoint, { filtros }, { page }),
    );
  }
}
