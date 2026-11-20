/**
 * Configuración del usuario autenticado dentro del contenedor
 * (`/general/configuracion-usuario/`). Son valores **por defecto** que el front
 * propone (al crear un documento, al abrir el POS…); no limitan lo que la
 * persona puede escoger.
 */
export interface ConfiguracionUsuarioRead {
  readonly sede: number | null;
  readonly sede_nombre: string | null;
  readonly almacen: number | null;
  readonly almacen_nombre: string | null;
  readonly caja: number | null;
  readonly caja_nombre: string | null;
}

/** PATCH parcial: solo viajan los campos enviados y `null` quita el valor. */
export interface ConfiguracionUsuarioPayload {
  readonly sede?: number | null;
  readonly almacen?: number | null;
  readonly caja?: number | null;
}
