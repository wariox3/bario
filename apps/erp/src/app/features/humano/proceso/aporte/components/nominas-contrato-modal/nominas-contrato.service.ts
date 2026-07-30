import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  LIST_PAGINATION_PARAMS,
  buildFiltros,
  type FilterCondition,
  type PaginatedResponse,
} from '@reddoc/core';
import type { LineaNominaDelContrato, NominaDelContrato } from './nominas-contrato.model';

/**
 * Clase de documento de nómina.
 *
 * `701` es el `documento_clase_id`, **no** el `documento_tipo_id` (14) con el que
 * el framework discrimina el documento. La clase agrupa a los tipos, así que el
 * cruce alcanza también a las nóminas de ajuste si el tenant las usa — que es lo
 * correcto: todas alimentan el IBC del periodo.
 */
const NOMINA_CLASE_ID = 701;

const DOCUMENTO_ENDPOINT = '/general/documento/';
const DOCUMENTO_DETALLE_ENDPOINT = '/general/documento-detalle/';

/**
 * Serializadores del cruce. Los nombres salen del ERP anterior.
 *
 * TODO(backend): confirmarlos en el API nuevo. El legacy los mandaba como query
 * params de un `GET`; acá viajan en el body del `POST …/lista/`, que es la
 * convención de este ERP.
 */
const SERIALIZADOR_NOMINA = 'lista_nomina';
const SERIALIZADOR_LINEA = 'nomina';

/**
 * Tope de registros del cruce. Un contrato tiene una o dos nóminas por periodo y
 * unas decenas de conceptos: se traen todos para poder totalizar sin paginar.
 */
const LIMITE = 500;

/** Una sola página con todo: el cruce se totaliza completo, no por página. */
const PAGINA_UNICA = {
  [LIST_PAGINATION_PARAMS.page]: 1,
  [LIST_PAGINATION_PARAMS.size]: LIMITE,
};

/**
 * Consulta las **nóminas de un contrato dentro de un periodo** y sus conceptos.
 *
 * Vive junto al modal y no en `AporteService` porque no toca ningún endpoint del
 * aporte: pega contra el master de documentos, que es justamente el punto —
 * cruzar lo que el aporte va a cotizar contra lo que ya se liquidó.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable()
export class NominasContratoService extends BaseHttpService {
  /** Las nóminas del contrato cuyo periodo cae dentro del rango del aporte. */
  listarNominas(
    contratoId: number,
    desde: string | null,
    hasta: string | null,
  ): Observable<PaginatedResponse<NominaDelContrato>> {
    return this.post<PaginatedResponse<NominaDelContrato>>(
      `${DOCUMENTO_ENDPOINT}lista/`,
      {
        filtros: buildFiltros([
          { field: 'documento_tipo__documento_clase_id', operator: 'eq', value: NOMINA_CLASE_ID },
          { field: 'contrato_id', operator: 'eq', value: contratoId },
          ...rangoDeFechas('fecha', desde, hasta),
        ]),
        ordenamientos: ['fecha'],
        serializador: SERIALIZADOR_NOMINA,
      },
      PAGINA_UNICA,
    );
  }

  /** Los conceptos liquidados en esas nóminas. */
  listarLineas(
    contratoId: number,
    desde: string | null,
    hasta: string | null,
  ): Observable<PaginatedResponse<LineaNominaDelContrato>> {
    return this.post<PaginatedResponse<LineaNominaDelContrato>>(
      `${DOCUMENTO_DETALLE_ENDPOINT}lista/`,
      {
        filtros: buildFiltros([
          {
            field: 'documento__documento_tipo__documento_clase_id',
            operator: 'eq',
            value: NOMINA_CLASE_ID,
          },
          { field: 'documento__contrato_id', operator: 'eq', value: contratoId },
          ...rangoDeFechas('documento__fecha', desde, hasta),
        ]),
        ordenamientos: ['documento__fecha'],
        serializador: SERIALIZADOR_LINEA,
      },
      PAGINA_UNICA,
    );
  }
}

/**
 * Acota un campo de fecha al periodo del aporte. Los extremos son opcionales: un
 * aporte recién creado puede no tener las fechas calculadas todavía, y en ese caso
 * es mejor mostrar de más que filtrar contra `null`.
 */
function rangoDeFechas(
  campo: string,
  desde: string | null,
  hasta: string | null,
): FilterCondition[] {
  const condiciones: FilterCondition[] = [];
  if (desde) condiciones.push({ field: campo, operator: 'gte', value: desde });
  if (hasta) condiciones.push({ field: campo, operator: 'lte', value: hasta });
  return condiciones;
}
