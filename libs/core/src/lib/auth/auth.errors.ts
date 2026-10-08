/**
 * Las credenciales (o el código) se aceptaron y las cookies ya están emitidas, pero el
 * `/me` que confirma la sesión no pudo responder — red caída, 500, timeout.
 *
 * Existe para que quien pinta el login **no** lo confunda con "código incorrecto": el
 * código ya se quemó, y mandar al usuario a reintentarlo lo hace fallar de verdad. Lo
 * único honesto en ese punto es pedirle que recargue.
 */
export class SesionNoConfirmadaError extends Error {
  /** El error original de la petición a `/me`. */
  readonly causa: unknown;

  constructor(causa: unknown) {
    super('La autenticación fue aceptada pero no se pudo confirmar la sesión.');
    this.name = 'SesionNoConfirmadaError';
    this.causa = causa;
  }
}
