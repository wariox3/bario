/**
 * Tipos del segundo factor propios de esta app. Las constantes (vigencia, espera de
 * reenvío, largos de código) y `formatSegundos` viven en `@reddoc/core`: las comparte
 * con el login de `libs/ui` y tener dos copias significaba dos relojes distintos.
 */

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

/**
 * Para qué se pidió el código. Las dos operaciones comparten modal y relojes; lo único
 * que cambia es el endpoint que lo confirma y el texto que lee el usuario.
 */
export type MfaIntentoModo = 'activar' | 'desactivar';

/**
 * Intento en curso: qué método, para qué y con qué token.
 *
 * Cuándo se pidió no vive acá: lo lleva el `RelojMfa` de la card, que es quien sabe qué
 * marca reiniciar en cada envío.
 */
export interface MfaIntento {
  /** `codigo` del método involucrado. */
  readonly metodo: string;
  readonly modo: MfaIntentoModo;
  readonly token: string;
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
