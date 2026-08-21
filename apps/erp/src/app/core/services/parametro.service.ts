import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';

/**
 * Parámetros del contenedor: **hechos que produce el sistema**, no datos que el
 * usuario edite.
 *
 * Es el gemelo de solo-lectura de `GenConfiguracion` (ver
 * `@erp/core/services/configuracion.service`): misma convención field-scoped
 * (`?campos=a,b`), pero sin `actualizar`. `gen_factura_electronica_activa` sale
 * de consultar el servicio de facturación electrónica, así que el front lo lee
 * y nunca lo escribe.
 */
export interface ParametroRead {
  readonly id: number;
  /** ¿El contenedor ya quedó habilitado para facturar electrónicamente? */
  readonly gen_factura_electronica_activa: boolean;
  /** Emisor con el que quedó habilitado; `null` mientras no lo esté. */
  readonly gen_factura_electronica_emisor: number | null;
}

/** Nombre de campo pedible (todo menos el `id`). */
export type ParametroCampo = keyof Omit<ParametroRead, 'id'>;

/**
 * Lee `/general/parametro/campos/`.
 *
 * Field-scoped: la respuesta trae **solo** los campos pedidos, así que el tipo
 * de retorno es parcial. Cross-feature a propósito — vive en `core/services`
 * porque los parámetros son del contenedor, no de un módulo.
 */
@Injectable({ providedIn: 'root' })
export class ParametroService extends BaseHttpService {
  private readonly resourcePath = '/general/parametro/';

  /** Trae solo los campos pedidos de los parámetros del contenedor activo. */
  getCampos(campos: readonly ParametroCampo[]): Observable<Partial<ParametroRead>> {
    return this.get<Partial<ParametroRead>>(`${this.resourcePath}campos/`, {
      campos: campos.join(','),
    });
  }

  /**
   * ¿La facturación electrónica ya está activa en este contenedor?
   *
   * Sonda de fondo: viaja con `errorToast: false` porque quien la consulta la
   * usa para decidir si ofrece algo, no para mostrar datos. Si falla, el
   * llamador degrada — no tiene sentido interrumpir la pantalla con un toast
   * por una invitación que simplemente no se muestra.
   */
  facturaElectronicaActiva(): Observable<boolean> {
    return this.get<Partial<ParametroRead>>(
      `${this.resourcePath}campos/`,
      { campos: 'gen_factura_electronica_activa' },
      { errorToast: false },
    ).pipe(map((parametro) => parametro.gen_factura_electronica_activa === true));
  }
}
