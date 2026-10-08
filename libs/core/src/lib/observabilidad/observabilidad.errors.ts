/** El backend respondió 5xx. Lo reporta `observabilidadInterceptor`. */
export class RespuestaServidorError extends Error {
  override readonly name = 'RespuestaServidorError';

  constructor(
    readonly metodo: string,
    readonly ruta: string,
    readonly status: number,
  ) {
    super(`${metodo} ${ruta} respondió ${status}`);
  }
}

/**
 * Una parte de la app (chunk lazy) no cargó ni después de recargar la página:
 * ya no es el caso normal de "hubo deploy y la pestaña tenía la versión vieja".
 */
export class ChunkNoCargaError extends Error {
  override readonly name = 'ChunkNoCargaError';

  constructor(readonly url: string) {
    super(`No se pudo cargar una parte de la app al navegar a ${url}, ni tras recargar`);
  }
}
