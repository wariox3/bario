import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseHttpService, type PaginatedResponse } from '@reddoc/core';
import type {
  NominaElectronicaDetalleRead,
  NominaElectronicaOrigen,
} from './nomina-electronica.model';

/** Endpoint de cabeceras de documento (compartido por toda la familia). */
const DOCUMENTO_ENDPOINT = '/general/documento/';

/** Endpoint de líneas de documento. Va con **guion**, no con guion bajo. */
const DOCUMENTO_DETALLE_ENDPOINT = '/general/documento-detalle/';

/**
 * Tope de nóminas origen por consolidado. Son las del periodo de **un
 * empleado** —una o dos, según se pague por mes o por quincena—, así que traer
 * todas en una página es holgado y evita paginar la ficha.
 */
const PAGE_SIZE = 200;

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
 *  - `listarDetalle`: sus líneas. `DocumentoDetalleService.listarPorDocumento`
 *    haría casi lo mismo, pero el legacy manda además un `serializador` acá; se
 *    deja el punto de extensión abierto en un solo lugar.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class NominaElectronicaService extends BaseHttpService {
  /**
   * Trae las nóminas que apuntan a este consolidado.
   *
   * **Supuesto pendiente de confirmar con backend**: que `documento_referencia_id`
   * sirve como query param del `GET` de listado. El legacy lo manda así junto a
   * `serializador=lista_nomina`; el serializador se omite acá, igual que en la
   * cabecera. Ver `PENDIENTES §7`.
   */
  listarOrigen(documentoId: number): Observable<NominaElectronicaOrigen[]> {
    return this.get<PaginatedResponse<NominaElectronicaOrigen>>(DOCUMENTO_ENDPOINT, {
      documento_referencia_id: documentoId,
      limit: PAGE_SIZE,
    }).pipe(map((res) => [...res.results]));
  }

  /** Trae los conceptos consolidados del documento. */
  listarDetalle(documentoId: number): Observable<NominaElectronicaDetalleRead[]> {
    return this.get<PaginatedResponse<NominaElectronicaDetalleRead>>(DOCUMENTO_DETALLE_ENDPOINT, {
      documento_id: documentoId,
      limit: PAGE_SIZE,
    }).pipe(map((res) => [...res.results]));
  }
}
