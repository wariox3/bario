export interface BaseUsuario {
  id: number;
  email: string;
  role?: string;
  nombre_corto?: string | null;
  celular?: string | null;
  imagen?: string | null;
  imagen_thumbnail?: string | null;
}

export interface Usuario extends BaseUsuario {
  nombre_corto: string | null;
  numero_identificacion: string | null;
  celular: string | null;
  idioma: string;
  imagen: string | null;
  imagen_thumbnail: string | null;
  is_verified: boolean;
  /** ¿El usuario tiene activa la autenticación en varias fases? */
  mfa_activo: boolean;
  /** `codigo` del método activo (`totp`, `sms`, `correo`). `null` si `mfa_activo` es `false`. */
  mfa_metodo: string | null;
  fecha_creacion: string;
}

/**
 * Lo que responde `POST /seguridad/login/` cuando la cuenta pide segundo factor:
 *
 * ```json
 * { "mfa_requerido": true, "mfa_token": "ImI3NWEx…:1wtrfP:XOVH0k…", "metodo": "correo" }
 * ```
 *
 * El **mismo** endpoint responde esto o emite las cookies de sesión, sin discriminante en
 * el status: `mfa_requerido` es lo único que los separa. Por eso `login()` no tipa la
 * respuesta directamente —tiparla sería afirmar algo que no se verificó— sino que la lee
 * con un guard que valida estos campos en runtime.
 */
export interface MfaDesafioResponse {
  /** Presente y en `true` solo en esta rama. Es el discriminante.  */
  readonly mfa_requerido: true;
  /**
   * Identifica el desafío en los pasos siguientes (`login/mfa/`, `login/mfa/reenviar/`).
   * Es un valor firmado por el backend: opaco, no se parsea ni se guarda.
   */
  readonly mfa_token: string;
  /** `codigo` del método por el que se mandó el código (`correo`, `sms`, `totp`). */
  readonly metodo: string;
}

/**
 * El desafío ya validado, tal como circula por el front: la respuesta **sin** el
 * discriminante, que después de leerla no aporta nada.
 *
 * Se deriva del tipo del cable a propósito: los nombres de los campos se declaran una sola
 * vez, y agregar uno al backend obliga a decidir qué hacer con él acá.
 */
export type MfaDesafio = Omit<MfaDesafioResponse, 'mfa_requerido'>;

/** Cuerpo de `POST /seguridad/login/mfa/`. */
export interface LoginMfaRequest {
  mfa_token: string;
  codigo: string;
  /** Deja una cookie de 30 días para no volver a pedir código en este navegador. */
  recordar_dispositivo?: boolean;
}

/**
 * Resultado de `login()`. Son dos desenlaces distintos, no un valor opcional:
 * o quedó sesión iniciada, o falta el segundo paso. Modelarlo como unión obliga a
 * quien llame a decidir qué hace en cada caso.
 */
export type LoginResult<TUser> =
  | { readonly estado: 'sesion'; readonly usuario: TUser | null }
  | { readonly estado: 'mfa'; readonly desafio: MfaDesafio };

export interface LoginRequest {
  email: string;
  password: string;
  turnstile_token?: string;
}

export interface AuthResponse<TUser = BaseUsuario> {
  user: TUser;
}

export interface ResendVerificationRequest {
  email: string;
  turnstile_token: string;
}

export interface RegisterRequest {
  nombre_corto: string;
  email: string;
  password: string;
  turnstile_token?: string;
}

export interface RegisteredUser {
  id: number;
  email: string;
  role: string;
  nombres: string;
  apellidos: string;
  numero_identificacion: string;
  is_verified: boolean;
}

export interface RegisterResponse {
  user: RegisteredUser;
  verification_link: string;
}
