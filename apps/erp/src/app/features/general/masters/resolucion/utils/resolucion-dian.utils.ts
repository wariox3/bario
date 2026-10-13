import type { Resolucion, ResolucionDian, ResolucionDianRow } from '../resolucion.model';

/**
 * Clave con la que una resolución de la DIAN y una de la empresa son la misma:
 * **prefijo + número**, el mismo criterio con el que `importar-dian/` responde
 * 400. La empresa no guarda el `id` del servicio, así que no hay otra.
 */
export function claveResolucion(prefijo: string, numero: string): string {
  return `${prefijo.trim()}|${numero.trim()}`;
}

/** Prefijos y números distintos de la página, para acotar la consulta de existentes. */
export function prefijosYNumerosDe(resoluciones: readonly ResolucionDian[]): {
  readonly prefijos: readonly string[];
  readonly numeros: readonly string[];
} {
  return {
    prefijos: [...new Set(resoluciones.map((r) => r.prefijo.trim()))],
    numeros: [...new Set(resoluciones.map((r) => r.numero_resolucion.trim()))],
  };
}

/**
 * Marca como `importada` cada resolución de la DIAN que la empresa ya tiene.
 * Casa el **par**: los dos `in` de la consulta pueden traer una de prefijo A
 * con el número de otra fila de prefijo B.
 */
export function marcarImportadas(
  dian: readonly ResolucionDian[],
  existentes: readonly Resolucion[],
): readonly ResolucionDianRow[] {
  const claves = new Set(existentes.map((r) => claveResolucion(r.prefijo, r.numero)));
  return dian.map((r) => ({
    ...r,
    importada: claves.has(claveResolucion(r.prefijo, r.numero_resolucion)),
  }));
}
