import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { BaseHttpService, type RequestOptions } from '@reddoc/core';
import type { EmisorConsulta, EmisorRedEDoc } from './factura-electronica.model';

/**
 * Habilitación de facturación electrónica del contenedor.
 *
 * Endpoints de `/general/factura-electronica/`, el trámite ante el proveedor —
 * distinto de `ParametroService`, que solo **lee** en qué estado quedó
 * (`gen_factura_electronica_activa`, `gen_factura_electronica_emisor`).
 */
/**
 * Crear, actualizar y desvincular apagan el toast del interceptor: el paso
 * RedEDoc muestra el error en la tarjeta del emisor, con el detalle que manda
 * el backend (ver `parseRedEDocError`).
 */
const SIN_TOAST: RequestOptions = { errorToast: false };

@Injectable({ providedIn: 'root' })
export class FacturaElectronicaService extends BaseHttpService {
  private readonly resourcePath = '/general/factura-electronica/';

  /**
   * Consulta en RedEDoc si la empresa ya está registrada como emisor; de eso
   * depende si después se actualiza o se crea.
   *
   * El backend contesta **404** cuando la empresa no tiene emisor: no es una
   * falla, es la mitad de las respuestas posibles, así que se traduce acá y se
   * apaga el toast del interceptor. Cualquier otro error sigue fallando.
   */
  consultarEmisor(): Observable<EmisorConsulta> {
    return this.get<EmisorRedEDoc>('/general/electronico/emisor-consultar/', undefined, {
      errorToast: false,
    }).pipe(
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
  actualizarEmisor(): Observable<unknown> {
    return this.patch<unknown>('/general/electronico/emisor-actualizar/', null, SIN_TOAST);
  }

  /**
   * Reasigna a esta empresa un emisor que ya existe en RedEDoc. Es la salida
   * cuando crear choca con `emisor_duplicado`: el id llega en el `emisor_id`
   * de ese error.
   */
  reasignarEmisor(emisor: number): Observable<void> {
    return this.post<void>(
      '/general/electronico/emisor-reasignar/',
      { emisor },
      undefined,
      SIN_TOAST,
    );
  }

  /**
   * Desvincula la empresa de su emisor en RedEDoc. Sin body: el backend sabe
   * cuál es por el tenant.
   */
  desvincularEmisor(): Observable<void> {
    return this.post<void>('/general/electronico/emisor-desvincular/', null, undefined, SIN_TOAST);
  }

  /**
   * Da de alta la empresa como emisor ante el proveedor.
   *
   * **Sin body a propósito**: el backend arma el registro con lo que hay en
   * `GenConfiguracion`, así que la configuración tiene que estar **guardada
   * antes** de llamar acá. Al terminar, `gen_factura_electronica_emisor` deja
   * de ser `null` — y a partir de ahí esos datos ya no se editan desde el ERP.
   */
  crearEmisor(): Observable<void> {
    return this.post<void>('/general/electronico/emisor-crear/', null, undefined, SIN_TOAST);
  }

  /**
   * Sube el certificado digital con su clave (multipart `archivo` + `clave`).
   *
   * El vencimiento no se envía: lo lee el backend del propio certificado y lo
   * deja en `gen_certificado_vence`. Por eso, después de subir, el estado se
   * relee en vez de darlo por sabido.
   */
  cargarCertificado(archivo: File, clave: string): Observable<void> {
    return this.postFile<void>(`${this.resourcePath}cargar-certificado/`, archivo, { clave });
  }
}
