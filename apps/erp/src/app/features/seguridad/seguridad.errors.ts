/**
 * El contenedor activo todavía no está en memoria (o se entró por una URL sin
 * tenant resuelto). Todas las operaciones de Seguridad cuelgan de `cliente_id`,
 * así que sin él no hay nada que pedirle al backend.
 */
export class ContenedorNoResueltoError extends Error {
  constructor() {
    super('No hay contenedor activo: la sección de Seguridad requiere un cliente_id.');
    this.name = 'ContenedorNoResueltoError';
  }
}

/**
 * Se intentó quitar un permiso del que no se conoce la fila de
 * `usuario-cliente-permiso`: sin su `id` no hay `DELETE` posible.
 */
export class PermisoSinAsignacionError extends Error {
  constructor(permisoId: number) {
    super(`El permiso ${permisoId} no tiene una fila de usuario-cliente-permiso conocida.`);
    this.name = 'PermisoSinAsignacionError';
  }
}
