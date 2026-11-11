import type { MembresiaContenedor } from './contenedor.model';
import type { ContenedorAccess } from '../tenant.types';

/**
 * Membresía de `/seguridad/usuario-cliente/usuario/` → contenedor activo.
 *
 * El `schema_name` no viaja en la respuesta: es el que se consultó. Un
 * `propietario` o `administrador` ausente se lee como `false`,
 * y el nombre y la imagen ausentes como `null`, que el header resuelve con el
 * slug y la inicial.
 */
export function membresiaToAccess(
  schemaName: string,
  membresia: MembresiaContenedor,
): ContenedorAccess {
  return {
    schema_name: schemaName,
    cliente_id: membresia.cliente_id,
    propietario: membresia.propietario === true,
    administrador: membresia.administrador === true,
    soporte: membresia.soporte,
    grupos: membresia.grupos,
    cliente_nombre: membresia.cliente_nombre ?? null,
    cliente_imagen_thumbnail: membresia.cliente_imagen_thumbnail ?? null,
  };
}
