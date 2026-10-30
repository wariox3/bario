import { Injectable, inject } from '@angular/core';
import { type Observable, delay, of } from 'rxjs';
import { BaseHttpService } from '../services/base-http.service';
import { ENVIRONMENT } from '../tokens';

/** Respuesta de `POST general/contacto/consulta-dian/`. */
export interface ConsultaDianResponse {
  readonly existe: boolean;
  readonly nombre: string;
  readonly correo: string;
  readonly codigo: string;
  readonly mensaje: string;
}

export interface ConsultaDianRequest {
  readonly identificacion_id: number;
  readonly numero_identificacion: string;
}

/** Lo que la consulta aporta al formulario de un contacto. */
export interface DatosConsultaDian {
  /** Persona natural: el nombre entero va a `nombre1` (no es fiable partirlo). */
  readonly nombre1?: string;
  /** Persona jurídica: razón social. */
  readonly nombre_corto?: string;
  readonly correo?: string;
}

/**
 * Consulta en la DIAN (a través de RedEDoc) el nombre y el correo registrados
 * para un documento, para autocompletar el alta de un contacto. La usan el
 * contacto del ERP y el cliente rápido del POS.
 *
 * La DIAN solo responde en producción (en habilitación no tiene adquirientes):
 * con `consultaDianSimulada` en el environment se responde con un ejemplo.
 */
@Injectable({ providedIn: 'root' })
export class ConsultaDianService extends BaseHttpService {
  private readonly simulada = inject(ENVIRONMENT).consultaDianSimulada ?? false;

  consultar(data: ConsultaDianRequest): Observable<ConsultaDianResponse> {
    if (this.simulada) return consultaDianSimulada(data.numero_identificacion);
    return this.post<ConsultaDianResponse>('/general/contacto/consulta-dian/', data);
  }
}

/**
 * Reparte la respuesta en los campos del contacto según el tipo de persona.
 * Solo trae lo que la DIAN devolvió con valor: así el formulario nunca borra lo
 * que la persona ya había escrito.
 */
export function datosDeConsultaDian(
  respuesta: ConsultaDianResponse,
  esNatural: boolean,
): DatosConsultaDian {
  const nombre = respuesta.nombre.trim();
  const correo = respuesta.correo.trim();
  return {
    ...(nombre ? (esNatural ? { nombre1: nombre } : { nombre_corto: nombre }) : {}),
    ...(correo ? { correo } : {}),
  };
}

/** Un número terminado en `0` no existe; cualquier otro devuelve el ejemplo de la DIAN. */
function consultaDianSimulada(numero: string): Observable<ConsultaDianResponse> {
  const respuesta: ConsultaDianResponse = numero.endsWith('0')
    ? {
        existe: false,
        nombre: '',
        correo: '',
        codigo: '404',
        mensaje: 'El adquirente No existe en la base de datos',
      }
    : {
        existe: true,
        nombre: 'ALMACENES EXITO S A',
        correo: 'njudiciales@grupo-exito.com',
        codigo: '200',
        mensaje: '',
      };
  return of(respuesta).pipe(delay(600));
}
