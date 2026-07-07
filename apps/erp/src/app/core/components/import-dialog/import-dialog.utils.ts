import type { ImportError } from './import-dialog.types';

/**
 * Forma del body de error que devuelve el backend cuando una importación falla
 * por validación (fase estructural o de negocio). Llega en `HttpErrorResponse.error`.
 */
export interface RawImportErrorResponse {
  /** Mensaje resumen para mostrar como banner. */
  readonly detail?: string;
  /** Fase en la que falló (`'estructural'`, etc.). Informativo. */
  readonly fase?: string;
  /** Total de errores detectados (puede ser mayor que los devueltos). */
  readonly total_errores?: number;
  /** Errores por fila. `fila` es opcional (errores sin fila asociada). */
  readonly errores?: ReadonlyArray<{ readonly fila?: number; readonly mensaje: string }>;
}

/** Resultado del parseo, listo para alimentar al `ImportDialogComponent`. */
export interface ParsedImportErrors {
  /** Errores mapeados al contrato del diálogo (`{row, message}`), capados a `max`. */
  readonly errors: ImportError[];
  /** Resumen (`detail`) o cadena vacía si no vino. */
  readonly summary: string;
  /** Total real de errores (`total_errores` o, en su defecto, los recibidos). */
  readonly total: number;
}

const EMPTY: ParsedImportErrors = { errors: [], summary: '', total: 0 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Parsea un string JSON; devuelve `null` si no es JSON válido. */
function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Traduce el body del backend al shape que consume el diálogo de importación.
 *
 * Sirve tanto para el body de error (`HttpErrorResponse.error`, 4xx) como para
 * un 200 que reporte problemas: el backend puede devolver los errores de
 * validación con cualquiera de los dos status. Defensivo: acepta el body como
 * objeto o como string JSON, y ante una forma inesperada (HTML, red, etc.)
 * devuelve `EMPTY`.
 *
 * @param input cuerpo crudo (`unknown`); objeto o string JSON.
 * @param max   máximo de filas a mostrar (default 100). El `total` conserva el real.
 */
export function parseImportErrors(input: unknown, max = 100): ParsedImportErrors {
  const body = typeof input === 'string' ? safeJsonParse(input) : input;
  if (!isRecord(body)) return EMPTY;

  const rawList = Array.isArray(body['errores']) ? (body['errores'] as ReadonlyArray<unknown>) : [];
  const errors: ImportError[] = rawList
    .filter(isRecord)
    .map((e) => {
      const fila = e['fila'];
      const row = typeof fila === 'number' && Number.isFinite(fila) ? fila : undefined;
      return { row, message: String(e['mensaje'] ?? '') };
    })
    .slice(0, max);

  const summary = typeof body['detail'] === 'string' ? body['detail'] : '';
  const totalErrores = body['total_errores'];
  const total = typeof totalErrores === 'number' ? totalErrores : rawList.length;

  return { errors, summary, total };
}
