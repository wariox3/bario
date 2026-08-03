/**
 * Un **almacén**: la bodega física contra la que se mueve el inventario.
 *
 * Es el master más chico del ERP — un nombre y nada más. Lo consumen los tres
 * documentos de inventario (entrada, salida, traslado) y las facturas de venta
 * y compra, todos vía `SELECT_ENDPOINTS.almacen`.
 *
 * **Supuesto pendiente de confirmar con backend**: que el modelo no tiene más
 * campos que estos dos. El ERP anterior solo edita `nombre`, pero eso no prueba
 * que el backend no exponga una sede, un código o una bandera de activo que su
 * formulario simplemente no muestre. Ver `PENDIENTES`.
 */
export interface Almacen {
  readonly id: number;
  readonly nombre: string;
}

/** Cuerpo de `POST`/`PUT` del master. */
export interface AlmacenPayload {
  nombre: string;
}
