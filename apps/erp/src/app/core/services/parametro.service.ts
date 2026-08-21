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
  /** Vencimiento del certificado digital (`AAAA-MM-DD`); `null` si no hay. */
  readonly gen_certificado_vence: string | null;
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
   * Consulta silenciosa: igual que `getCampos` pero con `errorToast: false`.
   *
   * La usan las sondas de abajo, que sirven para **decidir si ofrecer algo**, no
   * para mostrar datos. Si fallan, el llamador degrada: no tiene sentido
   * interrumpir la pantalla con un toast por algo que el usuario no pidió ver.
   */
  private sonda(campos: readonly ParametroCampo[]): Observable<Partial<ParametroRead>> {
    return this.get<Partial<ParametroRead>>(
      `${this.resourcePath}campos/`,
      { campos: campos.join(',') },
      { errorToast: false },
    );
  }

  /** ¿La facturación electrónica ya está activa en este contenedor? */
  facturaElectronicaActiva(): Observable<boolean> {
    return this.sonda(['gen_factura_electronica_activa']).pipe(
      map((parametro) => parametro.gen_factura_electronica_activa === true),
    );
  }

  /**
   * Emisor con el que el contenedor quedó habilitado ante la DIAN.
   *
   * `null` = consultado y todavía no hay emisor. El campo es de solo lectura:
   * lo escribe el flujo de habilitación, nunca el front.
   */
  facturaElectronicaEmisor(): Observable<number | null> {
    return this.sonda(['gen_factura_electronica_emisor']).pipe(
      map((parametro) => parametro.gen_factura_electronica_emisor ?? null),
    );
  }

  /**
   * Vencimiento del certificado digital, `null` si el contenedor no tiene uno.
   *
   * Lo escribe `cargar-certificado/` leyéndolo del propio archivo: el front no
   * lo manda ni lo puede corregir.
   */
  certificadoVence(): Observable<string | null> {
    return this.sonda(['gen_certificado_vence']).pipe(
      map((parametro) => parametro.gen_certificado_vence ?? null),
    );
  }
}
