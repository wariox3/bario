import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { BaseHttpService, type RequestOptions } from '@reddoc/core';
import type {
  CertificadoConsultaResponse,
  CertificadoRedEDoc,
  EmisorConsulta,
  EmisorRedEDoc,
  SoftwareActualizarPayload,
  SoftwareConsultaResponse,
  SoftwareCrearPayload,
  SoftwareModulo,
  SoftwareRedEDoc,
} from './factura-electronica.model';

/**
 * Todas las peticiones apagan el toast del interceptor: cada paso muestra el
 * error en su pantalla, con el detalle que manda el backend (ver
 * `parseRedEDocError`). Un toast más sería el mismo mensaje dos veces.
 */
const SIN_TOAST: RequestOptions = { errorToast: false };

const BASE = '/general/electronico/';

/**
 * Facturación electrónica de la empresa en RedEDoc: el emisor, su certificado
 * y el software de cada módulo.
 * Endpoints de `/general/electronico/`.
 */
@Injectable({ providedIn: 'root' })
export class FacturaElectronicaService extends BaseHttpService {
  /**
   * Consulta en RedEDoc si la empresa ya está registrada como emisor; de eso
   * depende si después se actualiza o se crea.
   *
   * El backend contesta **404** cuando la empresa no tiene emisor: no es una
   * falla, es la mitad de las respuestas posibles, así que se traduce acá y se
   * apaga el toast del interceptor. Cualquier otro error sigue fallando.
   */
  consultarEmisor(): Observable<EmisorConsulta> {
    return this.get<EmisorRedEDoc>(`${BASE}emisor-consultar/`, undefined, SIN_TOAST).pipe(
      map((emisor): EmisorConsulta => ({ registrado: true, emisor })),
      catchError((err: unknown) =>
        err instanceof HttpErrorResponse && err.status === HttpStatusCode.NotFound
          ? of<EmisorConsulta>({ registrado: false })
          : throwError(() => err),
      ),
    );
  }

  /**
   * Actualiza en RedEDoc el emisor ya registrado con la configuración guardada.
   * Sin body, igual que el alta: el backend lee `GenConfiguracion`.
   */
  actualizarEmisor(): Observable<void> {
    return this.patch<void>(`${BASE}emisor-actualizar/`, null, SIN_TOAST);
  }

  /**
   * Certificado digital de la empresa en RedEDoc, `null` si todavía no cargó
   * ninguno. El backend responde una lista paginada; hoy se toma el primero.
   */
  consultarCertificado(): Observable<CertificadoRedEDoc | null> {
    return this.get<CertificadoConsultaResponse>(
      `${BASE}certificado-consultar/`,
      undefined,
      SIN_TOAST,
    ).pipe(map((res) => res.results[0] ?? null));
  }

  /** Elimina el certificado digital de la empresa en RedEDoc. Sin body. */
  eliminarCertificado(): Observable<void> {
    return this.post<void>(`${BASE}certificado-eliminar/`, null, undefined, SIN_TOAST);
  }

  /**
   * Reasigna a esta empresa un emisor que ya existe en RedEDoc. Es la salida
   * cuando crear choca con `emisor_duplicado`: el id llega en el `emisor_id`
   * de ese error.
   */
  reasignarEmisor(emisor: number): Observable<void> {
    return this.post<void>(`${BASE}emisor-reasignar/`, { emisor }, undefined, SIN_TOAST);
  }

  /**
   * Desvincula la empresa de su emisor en RedEDoc. Sin body: el backend sabe
   * cuál es por el tenant.
   */
  desvincularEmisor(): Observable<void> {
    return this.post<void>(`${BASE}emisor-desvincular/`, null, undefined, SIN_TOAST);
  }

  /**
   * Da de alta la empresa como emisor ante el proveedor.
   *
   * **Sin body a propósito**: el backend arma el registro con lo que hay en
   * `GenConfiguracion`, así que la configuración tiene que estar **guardada
   * antes** de llamar acá. Si después cambian, se mandan con `actualizarEmisor`.
   */
  crearEmisor(): Observable<void> {
    return this.post<void>(`${BASE}emisor-crear/`, null, undefined, SIN_TOAST);
  }

  /**
   * Sube el certificado digital con su clave (multipart `archivo` + `clave`).
   *
   * La vigencia no se envía: la lee el backend del propio certificado. Por eso,
   * después de subir, se relee `consultarCertificado` en vez de darla por sabida.
   */
  cargarCertificado(archivo: File, clave: string): Observable<void> {
    return this.postFile<void>(
      `${BASE}certificado-cargar/`,
      archivo,
      { clave },
      'archivo',
      SIN_TOAST,
    );
  }

  /**
   * Software del emisor para un módulo (`facturacion`, `nomina`): a lo sumo
   * uno por tipo. Lista vacía si todavía no se creó ninguno.
   */
  consultarSoftware(modulo: SoftwareModulo): Observable<readonly SoftwareRedEDoc[]> {
    return this.get<SoftwareConsultaResponse>(
      `${BASE}software-consultar/`,
      { modulo },
      SIN_TOAST,
    ).pipe(map((res) => res.results));
  }

  /** Registra el software de un tipo. El módulo lo deduce el backend del `tipo`. */
  crearSoftware(payload: SoftwareCrearPayload): Observable<void> {
    return this.post<void>(`${BASE}software-crear/`, payload, undefined, SIN_TOAST);
  }

  /** Actualiza un software ya registrado; lo que no viaja se conserva (PATCH). */
  actualizarSoftware(payload: SoftwareActualizarPayload): Observable<void> {
    return this.patch<void>(`${BASE}software-actualizar/`, payload, SIN_TOAST);
  }
}
