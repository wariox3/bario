import { HttpErrorResponse } from '@angular/common/http';
import { extractErrorMessage } from '@reddoc/core';

/**
 * Error de una acción sobre el emisor en RedEDoc, ya listo para pintar.
 *
 * El backend responde así:
 * `{ "detail": "La solicitud no es válida.", "errores": [{ "codigo", "mensaje" }], "emisor_id": 7 }`.
 * Cada `mensaje` puede venir con el campo técnico adelante
 * (`"numero_identificacion: El emisor … ya está dado de alta."`); ese prefijo se
 * quita porque a la persona no le dice nada.
 */
export interface RedEDocError {
  readonly mensajes: readonly string[];
  /** Códigos de los errores (`emisor_duplicado`…), para decidir qué se ofrece. */
  readonly codigos: readonly string[];
  /** Emisor involucrado, si el backend lo informa: es lo que se le cita a soporte. */
  readonly emisorId: number | null;
}

interface RedEDocErrorBody {
  readonly detail?: unknown;
  readonly errores?: unknown;
  readonly emisor_id?: unknown;
}

/** Prefijo `campo: ` que el backend antepone al mensaje. */
const PREFIJO_CAMPO = /^[a-z_]+:\s*/;

export function parseRedEDocError(err: unknown, fallback: string): RedEDocError {
  const body: RedEDocErrorBody | null =
    err instanceof HttpErrorResponse && err.error && typeof err.error === 'object'
      ? (err.error as RedEDocErrorBody)
      : null;

  const errores: readonly unknown[] = Array.isArray(body?.errores) ? body.errores : [];
  const mensajes =
    errores.length > 0
      ? errores
          .map((e: unknown) =>
            e && typeof e === 'object' && typeof (e as { mensaje?: unknown }).mensaje === 'string'
              ? (e as { mensaje: string }).mensaje.replace(PREFIJO_CAMPO, '').trim()
              : '',
          )
          .filter((mensaje) => mensaje.length > 0)
      : [];

  const codigos = errores
    .map((e) =>
      e && typeof e === 'object' && typeof (e as { codigo?: unknown }).codigo === 'string'
        ? (e as { codigo: string }).codigo
        : '',
    )
    .filter((codigo) => codigo.length > 0);

  return {
    codigos,
    // Sin `errores` detallados se cae al `detail` (o al genérico): nunca vacío.
    mensajes: mensajes.length > 0 ? mensajes : [extractErrorMessage(err, fallback)],
    emisorId: typeof body?.emisor_id === 'number' ? body.emisor_id : null,
  };
}
