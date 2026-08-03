import { HttpErrorResponse } from '@angular/common/http';
import type {
  ProgramacionErroresMasivoResponse,
  ProgramacionErroresResponse,
  ProgramacionErrorItem,
} from './programacion.model';

/**
 * Utilidades del **400 de programación** (dueño único del shape del error). Las
 * comparten los modales de agregar y editar para no repetir los guards de
 * `HttpErrorResponse` ni el reparto de errores por alcance.
 */

/**
 * Extrae el body del 400 de `crear`/`actualizar`
 * (`{ detail, errores: [] }`), o `null` si el error no tiene esa forma.
 */
export function extraerErroresProgramacion(err: unknown): ProgramacionErroresResponse | null {
  if (!(err instanceof HttpErrorResponse)) return null;
  const body = err.error as Partial<ProgramacionErroresResponse> | null;
  return body && Array.isArray(body.errores) ? (body as ProgramacionErroresResponse) : null;
}

/**
 * Extrae el body del 400 de `actualizar-masivo`
 * (`{ detail, resultados: [{ indice, errores }] }`), o `null` si no tiene `resultados`.
 * Para el caso de validación global del batch (sin `resultados`) usar
 * `extraerErroresProgramacion` como fallback.
 */
export function extraerErroresMasivo(err: unknown): ProgramacionErroresMasivoResponse | null {
  if (!(err instanceof HttpErrorResponse)) return null;
  const body = err.error as Partial<ProgramacionErroresMasivoResponse> | null;
  return body && Array.isArray(body.resultados)
    ? (body as ProgramacionErroresMasivoResponse)
    : null;
}

/**
 * Extrae el `detail` (mensaje general) de un 400 de programación, si lo trae. Útil
 * para errores sin `errores[]` (ej. "Ya existe programación para este contrato y
 * puesto; use actualizar." o "Ya existe un prototipo para ese contrato y documento
 * detalle."): se muestra tal cual en el toast.
 *
 * DRF devuelve `detail` como **string** o como **lista de strings** (los
 * `ValidationError` de serializer llegan en lista); se contemplan ambos y la
 * lista se une con un espacio.
 */
export function extraerDetalleProgramacion(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse)) return null;
  const detail = (err.error as { readonly detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.filter((d): d is string => typeof d === 'string');
    return msgs.length ? msgs.join(' ') : null;
  }
  return null;
}

/**
 * Reparte los `errores` por alcance:
 *  - con `fecha` → celda (`fecha ISO → mensaje`) para resaltar la casilla del día.
 *  - sin `fecha` → aviso de puesto (ej. horas excedidas), no anclable a una casilla.
 */
export function separarErroresProgramacion(errores: readonly ProgramacionErrorItem[]): {
  readonly celdas: Map<string, string>;
  readonly avisos: string[];
} {
  const celdas = new Map<string, string>();
  const avisos: string[] = [];
  for (const e of errores) {
    if (e.fecha) celdas.set(e.fecha, e.mensaje);
    else avisos.push(e.mensaje);
  }
  return { celdas, avisos };
}

/**
 * Errores del 400 masivo mapeados por **scope** (id de puesto o de contrato,
 * según qué modal edite). Estructura común que consumen los modales de edición.
 */
export interface ErroresMasivoMapeados {
  /** scopeId → (fecha ISO → mensaje) para resaltar celdas del día. */
  readonly celdas: Map<number, Map<string, string>>;
  /** scopeId → mensajes sin fecha (avisos de la banda). */
  readonly avisos: Map<number, readonly string[]>;
  /** Validación global del batch (sin `indice` atribuible a un scope). */
  readonly globales: string[];
}

function acumularPorScope(
  acc: ErroresMasivoMapeados,
  scopeId: number,
  errores: readonly ProgramacionErrorItem[],
): void {
  const { celdas, avisos } = separarErroresProgramacion(errores);
  if (celdas.size) acc.celdas.set(scopeId, celdas);
  if (avisos.length) acc.avisos.set(scopeId, avisos);
}

/**
 * Mapea el 400 de `actualizar-masivo` a errores por scope. Dos formas:
 *  - `{ resultados: [{ indice, errores }] }` → celdas/avisos por línea, resolviendo
 *    el scope desde `payloads[indice]` con `scopeOf`.
 *  - `{ detail, errores }` sin `indice` (validación global del batch) → `globales`.
 * Puro: los modales lo comparten cambiando solo `scopeOf` (puesto vs contrato).
 */
export function mapearErroresMasivo<P>(
  err: unknown,
  payloads: readonly P[],
  scopeOf: (payload: P) => number,
): ErroresMasivoMapeados {
  const acc: ErroresMasivoMapeados = { celdas: new Map(), avisos: new Map(), globales: [] };
  const masivo = extraerErroresMasivo(err);
  if (masivo) {
    for (const linea of masivo.resultados) {
      const payload = payloads[linea.indice];
      if (!payload || !Array.isArray(linea.errores)) continue;
      acumularPorScope(acc, scopeOf(payload), linea.errores);
    }
    return acc;
  }
  const global = extraerErroresProgramacion(err);
  if (global) for (const e of global.errores) acc.globales.push(e.mensaje);
  return acc;
}

/**
 * Mapea el 400 de `actualizar` (una sola línea) a errores del `scopeId` dado.
 * Espejo de `mapearErroresMasivo` para el modo "línea" del modal de contrato.
 */
export function mapearErroresLinea(err: unknown, scopeId: number): ErroresMasivoMapeados {
  const acc: ErroresMasivoMapeados = { celdas: new Map(), avisos: new Map(), globales: [] };
  const body = extraerErroresProgramacion(err);
  if (body) acumularPorScope(acc, scopeId, body.errores);
  return acc;
}

/** Un mensaje de error del generar con los días (número) a los que aplica. */
export interface GenerarErrorGrupo {
  readonly mensaje: string;
  readonly dias: readonly string[];
}

/**
 * Vista del 400 de **generar** ya agrupada para el banner: el `detail` general,
 * los errores por día agrupados por mensaje (dedup de días) y los avisos sin fecha.
 */
export interface GenerarErroresVista {
  readonly detail: string;
  readonly grupos: readonly GenerarErrorGrupo[];
  readonly avisos: readonly string[];
}

/**
 * Agrupa los `errores` del 400 de generar por `mensaje` (deduplicando días — un
 * día trae una entrada por turno) y separa los que no tienen fecha como `avisos`.
 * Los días se emiten como número (`f.slice(8,10)` sin cero a la izquierda). Puro.
 */
export function construirGenerarErrores(parsed: ProgramacionErroresResponse): GenerarErroresVista {
  const porMensaje = new Map<string, Set<string>>();
  const avisos = new Set<string>();
  for (const e of parsed.errores) {
    if (!e.fecha) {
      avisos.add(e.mensaje);
      continue;
    }
    const fechas = porMensaje.get(e.mensaje) ?? new Set<string>();
    fechas.add(e.fecha);
    porMensaje.set(e.mensaje, fechas);
  }
  const grupos = [...porMensaje.entries()].map(([mensaje, fechas]) => ({
    mensaje,
    dias: [...fechas].sort().map((f) => f.slice(8, 10).replace(/^0/, '')),
  }));
  return { detail: parsed.detail, grupos, avisos: [...avisos] };
}
