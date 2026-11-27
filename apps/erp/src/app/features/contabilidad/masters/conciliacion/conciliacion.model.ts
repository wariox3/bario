/**
 * Contratos de datos de la **conciliación bancaria**.
 *
 * Es un master con endpoint propio (`contabilidad/conciliacion/`), no un
 * documento del endpoint genérico: una conciliación es una cuenta bancaria más
 * un rango de fechas, y cuelga de ella dos colecciones que se cruzan entre sí —
 * el libro (`conciliacion_detalle`) y el extracto del banco
 * (`conciliacion_soporte`).
 *
 * Contratos verificados contra el schema del backend (2026-11-27). Las FK traen
 * su texto como `<fk>_nombre`.
 */

/** Read-model de una conciliación (listado y ficha). */
export interface Conciliacion {
  readonly id: number;
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly cuenta_banco: number | null;
  readonly cuenta_banco_nombre: string | null;
}

/** Body (POST/PUT) de una conciliación. */
export interface ConciliacionPayload {
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly cuenta_banco: number | null;
}

/**
 * Línea del **libro**: el movimiento contable de la cuenta bancaria dentro del
 * periodo. Las genera el backend con `cargar/`, no se teclean.
 */
export interface ConciliacionDetalle {
  readonly id: number;
  readonly fecha: string | null;
  readonly debito: string | number | null;
  readonly credito: string | number | null;
  readonly detalle: string | null;
  /** `true` cuando el cruce encontró su contraparte en el extracto. */
  readonly estado_conciliado: boolean;
  readonly conciliacion: number;
  readonly cuenta: number | null;
  readonly cuenta_nombre: string | null;
  readonly contacto: number | null;
  readonly contacto_nombre_corto: string | null;
  readonly documento: number | null;
  readonly movimiento: number | null;
}

/**
 * Línea del **extracto bancario**, importada desde el Excel del banco.
 */
export interface ConciliacionSoporte {
  readonly id: number;
  readonly fecha: string | null;
  readonly debito: string | number | null;
  readonly credito: string | number | null;
  readonly detalle: string | null;
  /** `true` cuando el cruce encontró su contraparte en el libro. */
  readonly estado_conciliado: boolean;
}
