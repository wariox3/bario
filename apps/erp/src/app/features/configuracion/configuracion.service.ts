import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService, type RequestOptions } from '@reddoc/core';
import type {
  ConfiguracionCampo,
  ConfiguracionPayload,
  ConfiguracionRead,
} from './configuracion.model';

/**
 * Servicio HTTP de la configuración de la empresa.
 *
 * La API es **field-scoped**: la lectura pide solo los campos necesarios
 * (`?campos=gen_uvt,hum_salario_minimo`) y la escritura persiste solo los campos
 * enviados. Cada área (pestaña) lee y guarda únicamente lo suyo. Tenant-scoped
 * por defecto (la config es por empresa).
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionService extends BaseHttpService {
  private readonly resourcePath = '/general/configuracion/';

  /**
   * Trae solo los campos pedidos de la configuración de la empresa activa.
   * `opts` permite apagar el toast cuando la lectura es una sonda silenciosa.
   */
  obtener(
    campos: readonly ConfiguracionCampo[],
    opts?: RequestOptions,
  ): Observable<Partial<ConfiguracionRead>> {
    return this.get<Partial<ConfiguracionRead>>(
      `${this.resourcePath}campos/`,
      { campos: campos.join(',') },
      opts,
    );
  }

  /** Persiste solo los campos enviados (actualización parcial). */
  actualizar(payload: ConfiguracionPayload): Observable<Partial<ConfiguracionRead>> {
    return this.patch<Partial<ConfiguracionRead>>(`${this.resourcePath}actualizar/`, payload);
  }
}
