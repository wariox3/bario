/**
 * Agrupa la cotización por **tipo de entidad** y suma.
 *
 * Es la cifra que la empresa va a pagar, así que la lógica vive acá, pura y
 * testeada, y no repartida en un servicio con estado como en el ERP anterior
 * —donde además se agrupaba sobre **una página de 50 registros**, de modo que con
 * más entidades los subtotales y el total general quedaban mal—. Por eso el
 * servicio las trae todas de una (`listarEntidades`).
 */
import { toFiniteNumber } from '@reddoc/core';
import type { AporteEntidad } from './aporte.model';

export interface GrupoEntidades {
  /** Subsistema: salud, pensión, riesgos, caja… tal como lo nombra el backend. */
  readonly tipo: string;
  readonly entidades: readonly AporteEntidad[];
  readonly subtotal: number;
}

export interface EntidadesAgrupadas {
  readonly grupos: readonly GrupoEntidades[];
  /** Suma de todos los subtotales. */
  readonly total: number;
}

/** Etiqueta para las entidades que llegan sin tipo, para no perderlas del total. */
export const TIPO_SIN_CLASIFICAR = '—';

/**
 * Agrupa por tipo respetando el orden de llegada (el backend ordena por `tipo`) y
 * calcula subtotal por grupo y total general.
 *
 * Los importes pueden llegar como número o como string decimal, según el
 * serializador; lo que no sea numérico cuenta como cero en vez de contaminar la
 * suma con `NaN`.
 */
export function agruparEntidades(entidades: readonly AporteEntidad[]): EntidadesAgrupadas {
  const porTipo = new Map<string, { entidades: AporteEntidad[]; subtotal: number }>();

  for (const entidad of entidades) {
    const tipo = entidad.tipo ?? TIPO_SIN_CLASIFICAR;
    const grupo = porTipo.get(tipo) ?? { entidades: [], subtotal: 0 };
    grupo.entidades.push(entidad);
    grupo.subtotal += toFiniteNumber(entidad.cotizacion) ?? 0;
    porTipo.set(tipo, grupo);
  }

  const grupos = [...porTipo].map(([tipo, grupo]) => ({
    tipo,
    entidades: grupo.entidades,
    subtotal: grupo.subtotal,
  }));

  return {
    grupos,
    total: grupos.reduce((suma, grupo) => suma + grupo.subtotal, 0),
  };
}
