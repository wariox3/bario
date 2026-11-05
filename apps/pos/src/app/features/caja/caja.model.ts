/**
 * Caja física de una sede: donde se cobra. Shape de lectura de
 * `POST /venta/caja/lista/` y `GET /venta/caja/:id/`.
 *
 * `sede` viaja con el id pelado y `sede_nombre` lo acompaña ya resuelto.
 * Placa, ubicación y tipo son texto libre opcional.
 */
export interface Caja {
  readonly id: number;
  readonly nombre: string;
  readonly placa: string | null;
  readonly ubicacion: string | null;
  readonly tipo: string | null;
  readonly estado_activo: boolean;
  readonly sede: number;
  readonly sede_nombre: string | null;
}

/** Write-model de `POST /venta/caja/` y `PUT /venta/caja/:id/`. */
export interface CajaPayload {
  readonly nombre: string;
  readonly placa: string | null;
  readonly ubicacion: string | null;
  readonly tipo: string | null;
  readonly estado_activo: boolean;
  readonly sede: number;
}
