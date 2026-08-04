import type { ContenedorMember } from '@reddoc/core';

/**
 * Fila de la tabla de usuarios: el miembro del contenedor con el rol ya
 * resuelto a texto legible (el backend puede mandar `rol_nombre` vacío).
 */
export type UsuarioRow = ContenedorMember & { readonly rol_nombre: string };
