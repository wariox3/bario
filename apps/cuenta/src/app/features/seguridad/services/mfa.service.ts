import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import {
  MfaActivarResponse,
  MfaConfigurarResponse,
  MfaMetodoCatalogo,
} from '../models/mfa-metodo.model';

/*
 * ─── MOCK (en pausa, NO borrar) ─────────────────────────────────────────────
 * Respuesta real de `GET /seguridad/mfa/metodos/`, capturada el 2026-08-11.
 * Sirve para maquetar sin backend: descomentar los imports y la constante, y
 * cambiar el cuerpo de `listarMetodos()` por el bloque comentado del final.
 *
 * import { of } from 'rxjs';
 * import { delay } from 'rxjs/operators';
 *
 * const MFA_METODOS_MOCK: readonly MfaMetodoCatalogo[] = [
 *   { codigo: 'correo', nombre: 'Código por correo' },
 *   { codigo: 'sms', nombre: 'Código por SMS' },
 *   { codigo: 'totp', nombre: 'App autenticadora' },
 * ];
 *
 * // Latencia simulada para que el estado de carga sea real durante el desarrollo.
 * const MOCK_DELAY_MS = 450;
 * ────────────────────────────────────────────────────────────────────────────
 */

@Injectable({ providedIn: 'root' })
export class MfaService extends BaseHttpService {
  /**
   * Catálogo de métodos disponibles. Array pelado, sin envoltorio ni paginación.
   *
   * Cuál está activo NO sale de acá: sale de `mfa_metodo` en `/me`.
   */
  listarMetodos(): Observable<readonly MfaMetodoCatalogo[]> {
    return this.get<readonly MfaMetodoCatalogo[]>('/seguridad/mfa/metodos/');

    // MOCK (ver bloque de arriba): descomentar para trabajar sin backend.
    // return of(MFA_METODOS_MOCK).pipe(delay(MOCK_DELAY_MS));
  }

  /**
   * Arranca la activación de un método: dispara el envío del código y devuelve el
   * `mfa_token` que lo identifica. El método queda activo recién al verificar el código.
   */
  configurar(metodo: string): Observable<MfaConfigurarResponse> {
    return this.post<MfaConfigurarResponse>('/seguridad/mfa/configurar/', { metodo });
  }

  /**
   * Pide un código para una operación sensible sobre el MFA ya activo (hoy: desactivarlo).
   *
   * Va sin body: el backend sabe cuál es el método activo del usuario. Devuelve el mismo
   * par `{ mfa_token, metodo }` que `configurar()`, así el modal de código no distingue.
   */
  desafio(): Observable<MfaConfigurarResponse> {
    return this.post<MfaConfigurarResponse>('/seguridad/mfa/desafio/', {});
  }

  /**
   * Confirma el código que recibió el usuario y deja el método activo.
   *
   * El `mfa_token` es el que devolvió `configurar()` para este intento.
   */
  activar(mfaToken: string, codigo: string): Observable<MfaActivarResponse> {
    return this.post<MfaActivarResponse>(
      '/seguridad/mfa/activar/',
      { mfa_token: mfaToken, codigo },
      undefined,
      // El modal muestra el error junto al campo; el toast global quedaría detrás.
      { errorToast: false },
    );
  }

  /**
   * Apaga la autenticación en varias fases.
   *
   * Pide **contraseña además del código**: es una operación que baja la protección, así que
   * no alcanza con tener la sesión abierta. El `codigo` acepta el de 6 dígitos del desafío
   * o uno de respaldo de 10 caracteres.
   */
  desactivar(password: string, mfaToken: string, codigo: string): Observable<unknown> {
    return this.post<unknown>(
      '/seguridad/mfa/desactivar/',
      { password, mfa_token: mfaToken, codigo },
      undefined,
      { errorToast: false },
    );
  }
}
