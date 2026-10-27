import { HttpErrorResponse } from '@angular/common/http';

/** Respuesta de error de contabilizar, lista para pintar. */
export interface ContabilizarError {
  /** Resumen del backend (`Documento 157 (NOTA CREDITO COMPRA 2) no se pudo…`); `null` si no viene. */
  readonly detail: string | null;
  /** Un motivo por error (`Detalle 496: el impuesto…`), tal cual lo manda el backend. */
  readonly mensajes: readonly string[];
}

interface ContabilizarErrorBody {
  readonly detail?: unknown;
  readonly errores?: unknown;
}

function leerMensaje(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const { mensaje } = raw as { mensaje?: unknown };
  if (typeof mensaje !== 'string') return null;
  const texto = mensaje.trim();
  return texto || null;
}

/**
 * Error de `general/documento/contabilizar/`.
 *
 * El backend responde así:
 * `{ "detail": "Documento 157 (NOTA CREDITO COMPRA 2) no se pudo contabilizar.",
 *    "errores": [{ "documento_id": 157, "mensaje": "Detalle 496: …" }] }`.
 * El `detail` ya nombra el documento, así que de `errores` solo se toma el
 * mensaje.
 *
 * `mensajes` queda vacío si el cuerpo no trae `errores` legibles: el llamador
 * cae al `detail` con `extractErrorMessage`.
 */
export function parseContabilizarError(err: unknown): ContabilizarError {
  const body: ContabilizarErrorBody | null =
    err instanceof HttpErrorResponse && err.error && typeof err.error === 'object'
      ? (err.error as ContabilizarErrorBody)
      : null;

  const detail = typeof body?.detail === 'string' ? body.detail.trim() : '';
  return {
    detail: detail || null,
    mensajes: (Array.isArray(body?.errores) ? body.errores : [])
      .map(leerMensaje)
      .filter((mensaje): mensaje is string => mensaje !== null),
  };
}
