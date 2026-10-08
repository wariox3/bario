/**
 * Constantes del segundo factor, compartidas por quien lo configura (apps/cuenta) y por
 * quien lo pide para entrar (el login de `libs/ui`).
 */

/** Largo del código de verificación que llega por correo, SMS o app autenticadora. */
export const MFA_CODIGO_LARGO = 6;

/** Largo de un código de respaldo (`GIKV5U2WTS`). Sirve donde el backend lo permita. */
export const MFA_CODIGO_RESPALDO_LARGO = 10;

/** Vigencia del código, según el correo que manda el backend ("vence en 5 minutos"). */
export const MFA_CODIGO_VIGENCIA_SEGUNDOS = 300;

/**
 * Espera mínima entre envíos de código.
 *
 * Es UX, no seguridad: vive en memoria y se evade recargando la página. El límite de
 * verdad tiene que ponerlo el backend (429 + `retry_after`). Esto solo evita que el
 * usuario honesto se dispare correos de más por impaciencia.
 */
export const MFA_REENVIO_ESPERA_SEGUNDOS = 60;
