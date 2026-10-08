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
