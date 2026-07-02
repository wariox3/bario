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
 * Extrae el body del 400 de `crear`/`actualizar-programacion`
 * (`{ detail, errores: [] }`), o `null` si el error no tiene esa forma.
 */
export function extraerErroresProgramacion(err: unknown): ProgramacionErroresResponse | null {
  if (!(err instanceof HttpErrorResponse)) return null;
  const body = err.error as Partial<ProgramacionErroresResponse> | null;
  return body && Array.isArray(body.errores) ? (body as ProgramacionErroresResponse) : null;
}

/**
 * Extrae el body del 400 de `actualizar-programacion-masivo`
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
