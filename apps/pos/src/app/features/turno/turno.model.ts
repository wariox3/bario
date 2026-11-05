/**
 * Turno de un cajero en una caja: se abre con una base, se vende contra él y
 * se cierra con el arqueo. Shape de `GET /venta/turno/abierto/` y de la
 * respuesta de `POST /venta/turno/abrir/`.
 *
 * Solo lectura: el turno no tiene CRUD, se abre y se cierra por sus acciones.
 * Los decimales llegan como string (serialización Decimal de Django).
 */
export interface Turno {
  readonly id: number;
  readonly fecha_apertura: string;
  readonly fecha_cierre: string | null;
  readonly base: string;
  readonly total_venta: string;
  readonly cantidad_documentos: number;
  readonly estado_cerrado: boolean;
  readonly comentario: string | null;
  readonly caja: number;
  readonly caja_nombre: string | null;
  readonly caja_sede_nombre: string | null;
  readonly usuario: number;
  readonly usuario_nombre_corto: string | null;
  readonly cuenta_banco: number | null;
  readonly cuenta_banco_nombre: string | null;
}

/** Body de `POST /venta/turno/abrir/`. */
export interface AbrirTurnoPayload {
  readonly caja: number;
  readonly base: number;
  /** Dónde queda la base; obligatoria si la base es mayor que cero. */
  readonly cuenta_banco: number | null;
}

/** Fila del listado: el turno con sus fechas ya formateadas con hora. */
export interface TurnoFila extends Turno {
  readonly apertura: string;
  readonly cierre: string;
}

/** Lo esperado en una cuenta al cerrar: lo cobrado ahí más la base si es su cuenta. */
export interface TurnoResumenCuenta {
  readonly cuenta_banco: number;
  readonly cuenta_banco_nombre: string;
  readonly esperado: string;
}

/** `GET /venta/turno/<id>/resumen/`: lo vendido y lo esperado por cuenta bancaria. */
export interface TurnoResumen {
  readonly total_venta: string;
  readonly cantidad_documentos: number;
  readonly cuentas: readonly TurnoResumenCuenta[];
}

/** Lo contado en una cuenta al cerrar. */
export interface TurnoContado {
  readonly cuenta_banco: number;
  readonly valor: number;
}

/**
 * Body de `POST /venta/turno/cerrar/`. Tiene que traer toda cuenta con algo
 * esperado, y todas las ventas del turno deben estar aprobadas o anuladas.
 */
export interface CerrarTurnoPayload {
  readonly id: number;
  readonly contados: readonly TurnoContado[];
  readonly comentario: string | null;
}

/** Una línea del arqueo guardado: esperado contra contado en una cuenta. */
export interface TurnoDetalle {
  readonly id: number;
  readonly cuenta_banco: number;
  readonly cuenta_banco_nombre: string | null;
  readonly esperado: string;
  readonly contado: string;
  readonly diferencia: string;
}

/** El turno con su arqueo: respuesta de `cerrar/` y de `GET /venta/turno/<id>/`. */
export interface TurnoConDetalles extends Turno {
  readonly detalles: readonly TurnoDetalle[];
}
