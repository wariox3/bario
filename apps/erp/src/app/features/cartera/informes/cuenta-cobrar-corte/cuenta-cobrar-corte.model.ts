import type { PaginatedResponse } from '@reddoc/core';

/**
 * Fila del informe **Cuentas por cobrar corte**
 * (`POST /cartera/informe/pendiente-corte/`, `serializador: 'Informe'`).
 *
 * Es un documento de cartera visto **a una fecha de corte**: el `saldo` es lo
 * que quedaba pendiente por cobrar de ese documento **al día del corte** (no el
 * saldo vivo de hoy, que es lo que muestra el informe `cuenta-cobrar`).
 *
 * Convención del backend: los montos viajan como `string`/`number` con cola de
 * decimales; las fechas como `yyyy-MM-dd`. Los nombres aplanados usan doble
 * guion bajo (`documento_tipo__nombre`, `contacto__nombre_corto`).
 *
 * **Supuesto pendiente de confirmar con backend**: el endpoint
 * `cartera/informe/pendiente-corte/`, el `serializador: 'Informe'` y los nombres
 * de campo de abajo.
 */
export interface CuentaCobrarCorte {
  readonly id: number;
  readonly numero: number | string | null;
  readonly fecha: string | null;
  readonly fecha_vence: string | null;
  readonly documento_tipo_id: number | null;
  readonly documento_tipo__nombre: string | null;
  readonly contacto__numero_identificacion: string | null;
  readonly contacto__nombre_corto: string | null;
  readonly subtotal: string | number | null;
  readonly impuesto: string | number | null;
  readonly total: string | number | null;
  /** Abonos acumulados al corte. */
  readonly abono: string | number | null;
  /** Saldo pendiente por cobrar **al corte** (`total - abono`). */
  readonly saldo: string | number | null;
}

/**
 * Respuesta cruda del endpoint de corte. A diferencia del resto de listados del
 * ERP, no usa el envelope estándar `{ results, count }`.
 */
export interface CuentaCobrarCorteRawResponse {
  readonly registros: readonly CuentaCobrarCorte[];
  readonly cantidad_registros: number;
}

/**
 * Adapta la respuesta cruda `{ registros, cantidad_registros }` al envelope
 * paginado estándar `{ results, count }` que consumen la tabla y el resto del
 * front. Tolerante a campos faltantes.
 */
export function toPaginatedResponse(
  raw: CuentaCobrarCorteRawResponse,
): PaginatedResponse<CuentaCobrarCorte> {
  return {
    results: raw?.registros ?? [],
    count: raw?.cantidad_registros ?? 0,
    next: null,
    previous: null,
  };
}
