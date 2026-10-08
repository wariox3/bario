import { HttpErrorResponse } from '@angular/common/http';
import { extractErrorMessage } from '@reddoc/core';

/** Un error puntual de RedEDoc, con el campo técnico separado del mensaje. */
export interface RedEDocErrorDetalle {
  /** `emisor_duplicado`, `clave_invalida`…; vacío si el backend no lo manda. */
  readonly codigo: string;
  /** Campo al que se refiere (`clave`, `numero_identificacion`…); `null` si es general. */
  readonly campo: string | null;
  /** El mensaje sin el prefijo `campo: `, listo para mostrar. */
  readonly mensaje: string;
}

/**
 * Error de una acción en RedEDoc, ya listo para pintar.
 *
 * El backend responde así:
 * `{ "detail": "La solicitud no es válida.", "errores": [{ "codigo", "mensaje" }], "emisor_id": 7 }`.
 * Cada `mensaje` puede venir con el campo técnico adelante
 * (`"numero_identificacion: El emisor … ya está dado de alta."`): se separa,
 * porque a la persona no le dice nada pero sirve para llevar el error a su input.
 */
export interface RedEDocError {
  readonly detalles: readonly RedEDocErrorDetalle[];
  /** Mensajes para mostrar; nunca vacío (cae al `detail` o al genérico). */
  readonly mensajes: readonly string[];
  /** Emisor involucrado, si el backend lo informa: es lo que se le cita a soporte. */
  readonly emisorId: number | null;
}

interface RedEDocErrorBody {
  readonly errores?: unknown;
  readonly emisor_id?: unknown;
}

/** Prefijo `campo: ` que el backend antepone al mensaje. */
const PREFIJO_CAMPO = /^([a-z_]+):\s*/;

function leerDetalle(raw: unknown): RedEDocErrorDetalle | null {
  if (!raw || typeof raw !== 'object') return null;
  const { codigo, mensaje } = raw as { codigo?: unknown; mensaje?: unknown };
  if (typeof mensaje !== 'string') return null;
  const prefijo = PREFIJO_CAMPO.exec(mensaje);
  const texto = (prefijo ? mensaje.slice(prefijo[0].length) : mensaje).trim();
  if (!texto) return null;
  return {
    codigo: typeof codigo === 'string' ? codigo : '',
    campo: prefijo ? prefijo[1] : null,
    mensaje: texto,
  };
}

export function parseRedEDocError(err: unknown, fallback: string): RedEDocError {
  const body: RedEDocErrorBody | null =
    err instanceof HttpErrorResponse && err.error && typeof err.error === 'object'
      ? (err.error as RedEDocErrorBody)
      : null;

  const detalles = (Array.isArray(body?.errores) ? body.errores : [])
    .map(leerDetalle)
    .filter((detalle): detalle is RedEDocErrorDetalle => detalle !== null);

  return {
    detalles,
    // Sin `errores` detallados se cae al `detail` (o al genérico): nunca vacío.
    mensajes:
      detalles.length > 0
        ? detalles.map((detalle) => detalle.mensaje)
        : [extractErrorMessage(err, fallback)],
    emisorId: typeof body?.emisor_id === 'number' ? body.emisor_id : null,
  };
}

/** ¿Alguno de los errores trae este código? */
export function tieneCodigo(error: RedEDocError, codigo: string): boolean {
  return error.detalles.some((detalle) => detalle.codigo === codigo);
}
