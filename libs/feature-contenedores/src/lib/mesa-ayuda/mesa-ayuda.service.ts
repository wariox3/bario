import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService, type RequestOptions } from '@reddoc/core';

/** Tipos de caso que acepta la mesa de ayuda (`CasoNuevoTipoEnum`). */
export type CasoTipo = 'SOP' | 'ERR' | 'CES' | 'DES' | 'SOL' | 'SER';

export interface CasoNuevo {
  readonly tipo: CasoTipo;
  /** Entre 1 y `CASO_DESCRIPCION_MAX` caracteres. */
  readonly descripcion: string;
}

/** Lo que responde el alta: el caso quedó creado aunque fallara algún adjunto. */
export interface CasoCreado {
  readonly id: number;
  readonly adjuntos_fallidos: number;
}

/** Un caso de la lista: los tres estados avanzan en ese orden. */
export interface CasoResumen {
  readonly id: number;
  readonly descripcion: string;
  readonly estado_atendido: boolean;
  readonly estado_respuesta: boolean;
  readonly estado_cerrado: boolean;
}

/** Tope de `descripcion` en el backend. */
export const CASO_DESCRIPCION_MAX = 5000;

/**
 * Mesa de ayuda de la plataforma. Vive en el schema público: el caso es de la
 * persona, no de una empresa, así que va sin `X-Tenant`.
 */
@Injectable({ providedIn: 'root' })
export class MesaAyudaService extends BaseHttpService {
  protected override readonly tenantScoped = false;

  /** El backend completa el usuario (id, nombre, correo, celular) desde la sesión. */
  crearCaso(caso: CasoNuevo, opts?: RequestOptions): Observable<CasoCreado> {
    return this.post<CasoCreado>('/contenedor/mesa-ayuda/caso/', caso, undefined, opts);
  }

  /** Los 3 últimos casos de la persona, del más nuevo al más viejo. */
  misCasos(opts?: RequestOptions): Observable<readonly CasoResumen[]> {
    return this.get<readonly CasoResumen[]>('/contenedor/mesa-ayuda/caso/lista/', undefined, opts);
  }
}
