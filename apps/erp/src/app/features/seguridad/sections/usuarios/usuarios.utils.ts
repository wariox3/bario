import type { ContenedorMember, FilterCondition, ParamValue } from '@reddoc/core';
import { CONTENEDOR_ROL } from '@erp/core/permissions';
import { ROL_LABEL_KEY_BY_ID, SEGURIDAD_USUARIOS_SEARCH_PARAM } from './usuarios.constants';
import type { UsuarioRow } from './usuarios.model';

/** Diccionario de nombres de rol; lo aporta el i18n de la app. */
export type RolesDict = Readonly<Record<'propietario' | 'administrador' | 'usuario', string>>;

/** Nombre legible del rol: el del backend, con respaldo por id si viene vacío. */
export function rolNombre(member: ContenedorMember, roles: RolesDict): string {
  return (
    member.rol_nombre?.trim() ||
    roles[ROL_LABEL_KEY_BY_ID[member.rol_id ?? CONTENEDOR_ROL.usuario] ?? 'usuario']
  );
}

/** Miembro → fila de tabla, con el rol ya resuelto a texto. */
export function toUsuarioRow(member: ContenedorMember, roles: RolesDict): UsuarioRow {
  return { ...member, rol_nombre: rolNombre(member, roles) };
}

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
 *  - `rol_nombre` se filtra por el mismo nombre con el que viene en la
 *    respuesta; si el backend expone el rol por relación, será `rol__nombre`.
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
