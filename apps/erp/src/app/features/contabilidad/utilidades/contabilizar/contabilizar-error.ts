import { HttpErrorResponse } from '@angular/common/http';

/** Un documento que el backend no pudo contabilizar, con su motivo. */
export interface ContabilizarErrorDocumento {
  readonly documentoId: number;
  /** El mensaje tal cual lo manda el backend (`Detalle 496: el impuesto…`). */
  readonly mensaje: string;
}

interface ContabilizarErrorBody {
  readonly errores?: unknown;
}

function leerError(raw: unknown): ContabilizarErrorDocumento | null {
  if (!raw || typeof raw !== 'object') return null;
  const { documento_id, mensaje } = raw as { documento_id?: unknown; mensaje?: unknown };
  if (typeof documento_id !== 'number' || typeof mensaje !== 'string') return null;
  const texto = mensaje.trim();
  return texto ? { documentoId: documento_id, mensaje: texto } : null;
}

/**
 * Errores por documento de `general/documento/contabilizar/`.
 *
 * El backend responde así:
 * `{ "detail": "Documento 157 (NOTA CREDITO COMPRA 2): detalle 496: …",
 *    "errores": [{ "documento_id": 157, "mensaje": "Detalle 496: …" }] }`.
 * El `detail` resume solo el primero; `errores` trae uno por documento que
 * falló, que es lo que hace falta para mostrar el lote completo.
 *
 * Devuelve `[]` si el cuerpo no trae `errores` legibles: el llamador cae al
 * `detail` con `extractErrorMessage`.
 */
export function parseContabilizarErrores(err: unknown): readonly ContabilizarErrorDocumento[] {
  const body: ContabilizarErrorBody | null =
    err instanceof HttpErrorResponse && err.error && typeof err.error === 'object'
      ? (err.error as ContabilizarErrorBody)
      : null;

  return (Array.isArray(body?.errores) ? body.errores : [])
    .map(leerError)
    .filter((error): error is ContabilizarErrorDocumento => error !== null);
}
