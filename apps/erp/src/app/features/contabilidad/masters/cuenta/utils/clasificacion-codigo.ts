import type { ErpSelectOption } from '@reddoc/core';

/** Nivel del PUC que el código contradice. */
export type NivelClasificacion = 'clase' | 'grupo' | 'cuenta';

export interface DesajusteClasificacion {
  readonly nivel: NivelClasificacion;
  /** Prefijo con el que debería empezar el código (el id del nivel). */
  readonly prefijo: string;
  readonly nombre: string;
}

export interface ClasificacionElegida {
  readonly cuenta_clase: ErpSelectOption | null;
  readonly cuenta_grupo: ErpSelectOption | null;
  readonly cuenta_cuenta: ErpSelectOption | null;
}

/**
 * Compara el código con la clasificación elegida. En el PUC el id de cada nivel
 * es el prefijo del código (clase `1`, grupo `11`, cuenta `1105`), así que basta
 * con mirar el nivel más específico elegido: si el código empieza por él, también
 * empieza por sus padres.
 *
 * Es una advertencia, no un error: devuelve el desajuste o `null` si no lo hay
 * (o si todavía no hay código o nivel con qué comparar).
 */
export function desajusteClasificacion(
  codigo: string | null,
  clasificacion: ClasificacionElegida,
): DesajusteClasificacion | null {
  if (!codigo) return null;
  const niveles: readonly [NivelClasificacion, ErpSelectOption | null][] = [
    ['cuenta', clasificacion.cuenta_cuenta],
    ['grupo', clasificacion.cuenta_grupo],
    ['clase', clasificacion.cuenta_clase],
  ];
  const elegido = niveles.find(([, opcion]) => opcion != null);
  if (!elegido) return null;
  const [nivel, opcion] = elegido;
  if (!opcion) return null;
  const prefijo = String(opcion.id);
  return codigo.startsWith(prefijo) ? null : { nivel, prefijo, nombre: opcion.nombre };
}
