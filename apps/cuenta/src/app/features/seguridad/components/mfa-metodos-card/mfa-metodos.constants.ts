import { MfaMetodoPresentacion } from '../../models/mfa-metodo.model';

/**
 * Decoración del catálogo: si llega un `codigo` desconocido se usa `MFA_METODO_FALLBACK`,
 * así un método nuevo del backend aparece bien sin tocar el front.
 */

export const MFA_METODO_PRESENTACION: Record<string, MfaMetodoPresentacion> = {
  totp: {
    descripcion: 'Códigos que cambian cada 30 segundos en tu teléfono',
    icono: 'pi pi-mobile',
    recomendado: true,
  },
  sms: {
    descripcion: 'Te enviamos un código al celular',
    icono: 'pi pi-comment',
    recomendado: false,
  },
  correo: {
    descripcion: 'Te enviamos un código a tu correo',
    icono: 'pi pi-envelope',
    recomendado: false,
  },
};

/**
 * Métodos que el front deja activar hoy. Los demás salen en la lista como
 * "próximamente": el catálogo del backend ya los ofrece, pero su flujo todavía no
 * está terminado (`totp` necesita QR/secreto; `sms` necesita el celular verificado).
 *
 * TEMPORAL: sumar el `codigo` acá es todo lo que hace falta para habilitarlos.
 */
export const MFA_METODOS_HABILITADOS: ReadonlySet<string> = new Set(['correo']);

/** Para un `codigo` que el backend agregue y el front todavía no conozca. */
export const MFA_METODO_FALLBACK: MfaMetodoPresentacion = {
  descripcion: 'Un código para confirmar que eres tú',
  icono: 'pi pi-shield',
  recomendado: false,
};
