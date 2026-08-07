import type {
  FilterCondition,
  ParamValue,
  PermisoCatalogoFiltros,
  PermisoSeguridad,
} from '@reddoc/core';
import {
  ACCIONES_PERMISO,
  SEGURIDAD_USUARIOS_SEARCH_PARAM,
  type AccionColumna,
} from './usuarios.constants';

/**
 * Búsqueda + filtros de la pantalla → **query params** de `lista-cliente/`.
 *
 * El listado se pide por `GET`, no por el `POST …/lista/` de los masters, así
 * que no aplican `buildFiltros`/`buildListBody` (arman un body). Se sigue la
 * misma convención Django REST que ya usa el ERP para sus listados por `GET`
 * (ver `aporte.service.ts`): `campo=valor` para igualdad y
 * `campo__operador=valor` para el resto.
 *
 * SUPUESTOS pendientes de confirmar con backend:
 *  - La búsqueda rápida viaja como `search=` (el `SearchFilter` genérico de DRF,
 *    ya en uso en `/seguridad/usuario/seleccionar/`). Es lo único que conserva
 *    el OR sobre nombre y correo que tenía la búsqueda en memoria.
 *  - `propietario` se filtra por el mismo nombre con el que viene en la
 *    respuesta, con el `true`/`false` que serializa el constructor de filtros.
 */
export function usuariosQueryParams(
  search: string,
  filtros: readonly FilterCondition[],
): Record<string, ParamValue> {
  const params: Record<string, ParamValue> = {};

  const term = search.trim();
  if (term) params[SEGURIDAD_USUARIOS_SEARCH_PARAM] = term;

  for (const filtro of filtros) {
    const clave = filtro.operator === 'eq' ? filtro.field : `${filtro.field}__${filtro.operator}`;
    params[clave] = Array.isArray(filtro.value) ? filtro.value.join(',') : String(filtro.value);
  }

  return params;
}

/**
 * Identidad de una consulta al catálogo de permisos: la comparten la cache del
 * servicio y el dedupe del stream del picker, para que no puedan divergir (una
 * clave que ignore un filtro se traga consultas en silencio).
 */
export function permisoCatalogoKey(filtros: PermisoCatalogoFiltros): string {
  return [filtros.app, filtros.modelo, filtros.accion, filtros.search, filtros.page, filtros.limit]
    .map((valor) => valor ?? '')
    .join('|');
}

/** Fila de la matriz de permisos: un modelo con su permiso por acción. */
export interface PermisoModeloFila {
  readonly modelo: string;
  readonly label: string;
  readonly porAccion: ReadonlyMap<AccionColumna, PermisoSeguridad>;
  /** Permisos custom fuera de las cuatro acciones estándar. */
  readonly extras: readonly PermisoSeguridad[];
}

export interface PermisoAppGrupo {
  readonly app: string;
  readonly modelos: readonly PermisoModeloFila[];
}

/**
 * Permisos → matriz app → modelo × acción. La usan tanto la lista de asignados
 * como el picker del catálogo: ambos reciben el mismo serializador del backend
 * y se pintan con la misma tabla.
 */
export function agruparPermisos(permisos: readonly PermisoSeguridad[]): readonly PermisoAppGrupo[] {
  const porApp = new Map<
    string,
    Map<
      string,
      { label: string; porAccion: Map<AccionColumna, PermisoSeguridad>; extras: PermisoSeguridad[] }
    >
  >();

  for (const permiso of permisos) {
    let modelos = porApp.get(permiso.app);
    if (!modelos) porApp.set(permiso.app, (modelos = new Map()));
    let fila = modelos.get(permiso.modelo);
    if (!fila) {
      modelos.set(
        permiso.modelo,
        (fila = { label: permiso.modelo_label, porAccion: new Map(), extras: [] }),
      );
    }
    if ((ACCIONES_PERMISO as readonly string[]).includes(permiso.accion)) {
      fila.porAccion.set(permiso.accion as AccionColumna, permiso);
    } else {
      fila.extras.push(permiso);
    }
  }

  return [...porApp].map(([app, modelos]) => ({
    app,
    modelos: [...modelos].map(([modelo, fila]) => ({ modelo, ...fila })),
  }));
}
