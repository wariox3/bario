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
  /**
   * ¿El contenedor todavía no resolvió sus datos iniciales?
   *
   * `true` = recién creado, nunca cargó ni descartó la plantilla: hay que
   * ofrecerle el asistente. Lo apaga el propio backend cuando el contenedor
   * pasa por `plantilla/cargar/` o `plantilla/descartar/`.
   */
  readonly gen_asistente_datos_iniciales: boolean;
  /**
   * ¿Hay que ofrecerle el asistente de facturación electrónica (venta)?
   *
   * Nace en `true` y lo apaga `asistente-terminar/`, que se llama tanto al
   * omitir la invitación del inicio de Venta como al finalizar el asistente.
   */
  readonly gen_asistente_electronico_venta: boolean;
  /** Lo mismo para el asistente de nómina electrónica. */
  readonly gen_asistente_electronico_nomina: boolean;
}

/** Módulo con asistente electrónico propio: cada uno tiene su parámetro. */
export type AsistenteElectronicoModulo = 'venta' | 'nomina';

const PARAMETRO_ASISTENTE = {
  venta: 'gen_asistente_electronico_venta',
  nomina: 'gen_asistente_electronico_nomina',
} as const satisfies Record<AsistenteElectronicoModulo, keyof ParametroRead>;

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

  /**
   * ¿Hay que ofrecerle a este contenedor el asistente electrónico del módulo
   * (venta o nómina)? Como el de datos iniciales, el `true` es lo que hace
   * aparecer la invitación; `false` es que ya se terminó u omitió.
   */
  asistenteElectronico(modulo: AsistenteElectronicoModulo): Observable<boolean | null> {
    const campo = PARAMETRO_ASISTENTE[modulo];
    // `null` si el campo no vino (p. ej. el backend todavía no lo publica): no
    // es lo mismo que `false`, que significa «ya se cerró».
    return this.sonda([campo]).pipe(
      map((parametro) => (typeof parametro[campo] === 'boolean' ? parametro[campo] : null)),
    );
  }

  /**
   * ¿Hay que ofrecerle a este contenedor el asistente de datos iniciales?
   *
   * Al revés que las otras sondas: acá el `true` es lo que hace aparecer algo
   * en pantalla (el contenedor está en blanco). Un contenedor que ya cargó o
   * descartó la plantilla responde `false` y no vuelve a ver la invitación.
   */
  asistenteDatosIniciales(): Observable<boolean> {
    return this.sonda(['gen_asistente_datos_iniciales']).pipe(
      map((parametro) => parametro.gen_asistente_datos_iniciales === true),
    );
  }
}
