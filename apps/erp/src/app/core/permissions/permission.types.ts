/**
 * Vocabulario de permisos del usuario.
 *
 * El backend concede **por modelo**: `GET /general/modelo/<id>/permiso/` responde
 * qué puede hacer el usuario sobre esa tabla. Un modelo es global —contactos es
 * `10001` se entre desde General, Venta o Compra—, así que el front no necesita
 * más vocabulario que el id del modelo (ver `modelo.catalog.ts`) y la acción.
 *
 * No confundir con dos cosas vecinas:
 *  - `PermissionsService.enabledModuleIds` — qué módulos **compró el tenant**
 *    (plan). Es del contenedor, no del usuario.
 *  - `propietario` del contenedor — quién administra la empresa en sí. Gobierna la
 *    pantalla de Seguridad, no el trabajo operativo.
 *
 * Los tres ejes son ortogonales: el acceso final es su intersección.
 */

/** Acciones que un permiso puede conceder sobre un modelo. */
export type PermissionAction = 'ver' | 'crear' | 'editar' | 'eliminar';

/**
 * Lo que responde el backend para un modelo:
 * `{"ver":false,"crear":false,"editar":false,"eliminar":false}`.
 */
export type ModelGrants = Readonly<Record<PermissionAction, boolean>>;

/**
 * Predicado de permiso ligado a un modelo concreto. Lo arma la pantalla una vez
 * y lo consumen los helpers que podan acciones, para que no anden paseando el id.
 */
export type ActionPredicate = (accion: PermissionAction) => boolean;
