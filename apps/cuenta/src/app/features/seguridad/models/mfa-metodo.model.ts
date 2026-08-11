/**
 * Un método de autenticación en varias fases, tal como lo lista
 * `GET /seguridad/mfa/metodos/`.
 *
 * El endpoint es un **catálogo**: dice qué métodos existen, no cuál usa el usuario.
 * El estado del usuario vive en `/me` (`mfa_activo` + `mfa_metodo`).
 */
export interface MfaMetodoCatalogo {
  /** Identificador estable del método: `totp`, `sms`, `correo`. */
  readonly codigo: string;
  /** Etiqueta que manda el backend, ya en el idioma del usuario. */
  readonly nombre: string;
}

/** Respuesta de `POST /seguridad/mfa/configurar/`. */
export interface MfaConfigurarResponse {
  /** Identifica el intento de activación. Viaja al verificar el código. */
  readonly mfa_token: string;
  /** Eco del método solicitado. */
  readonly metodo: string;
}

/**
 * Respuesta de `POST /seguridad/mfa/activar/`.
 *
 * Los `codigos_respaldo` llegan **una única vez**: el backend no los vuelve a mostrar.
 * Quien consuma esta respuesta tiene la obligación de dárselos al usuario antes de
 * dejarlo seguir.
 */
export interface MfaActivarResponse {
  readonly detail: string;
  readonly codigos_respaldo: readonly string[];
}

/** Vigencia del código, según el correo que manda el backend ("vence en 5 minutos"). */
export const MFA_CODIGO_VIGENCIA_SEGUNDOS = 300;

/** Largo del código de verificación. */
export const MFA_CODIGO_LARGO = 6;

/** Largo de un código de respaldo (`GIKV5U2WTS`). Sirve donde el backend lo permita. */
export const MFA_CODIGO_RESPALDO_LARGO = 10;

/**
 * Espera mínima entre envíos de código.
 *
 * Es UX, no seguridad: vive en memoria y se evade recargando la página. El límite de
 * verdad tiene que ponerlo el backend (429 + `retry_after`). Esto solo evita que el
 * usuario honesto se dispare correos de más por impaciencia.
 */
export const MFA_REENVIO_ESPERA_SEGUNDOS = 60;

/**
 * Para qué se pidió el código. Las dos operaciones comparten modal y relojes; lo único
 * que cambia es el endpoint que lo confirma y el texto que lee el usuario.
 */
export type MfaIntentoModo = 'activar' | 'desactivar';

/** Intento en curso: qué método, para qué, con qué token y desde cuándo. */
export interface MfaIntento {
  /** `codigo` del método involucrado. */
  readonly metodo: string;
  readonly modo: MfaIntentoModo;
  readonly token: string;
  /** Epoch en ms del envío que generó este token. */
  readonly pedidoEn: number;
}

/** `152` → `2:32`. El minuto adelante para que se lea como reloj. */
export function formatSegundos(total: number): string {
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return `${minutos}:${segundos.toString().padStart(2, '0')}`;
}

/**
 * Lo que el backend NO manda del catálogo: ícono, explicación y cuál sugerimos.
 * El `nombre` sí lo manda el backend y es el que se pinta.
 */
export interface MfaMetodoPresentacion {
  readonly descripcion: string;
  readonly icono: string;
  /** El más seguro del catálogo: se sugiere cuando no hay nada activo. */
  readonly recomendado: boolean;
}

/** Un método listo para pintar: catálogo del backend + decoración + estado del usuario. */
export interface MfaMetodoFila extends MfaMetodoCatalogo {
  readonly presentacion: MfaMetodoPresentacion;
  /** Es el método que el usuario tiene activo (`mfa_metodo` de `/me`). */
  readonly activo: boolean;
  /** El front ya soporta su flujo. Si no, se muestra como "próximamente". */
  readonly habilitado: boolean;
  /** Se sugiere: el recomendado, y solo mientras no haya ninguno activo. */
  readonly sugerido: boolean;
}
