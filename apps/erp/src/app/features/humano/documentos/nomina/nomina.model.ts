import type { DocumentoReadBase } from '@reddoc/core';

/**
 * Cabecera de una **nómina** (`documento_tipo_id = 14`) leída desde
 * `GET /general/documento/:id/`.
 *
 * Extiende el esqueleto común de documento con los campos de la familia
 * humano: el periodo liquidado, el empleado, su contrato y las bases de
 * liquidación. No trae `subtotal`/`impuesto` como los documentos comerciales:
 * su desglose es devengado − deducción = total.
 *
 * **Supuestos pendientes de confirmar con backend**, tomados del ERP legacy:
 * `salario`, `base_prestacion`, `base_cotizacion`, `contrato_id`,
 * `programacion_detalle_id` y los `contacto_*` aplanados.
 */
export interface NominaRead extends DocumentoReadBase {
  /** Consecutivo del documento. */
  readonly numero?: string | null;
  /** Periodo liquidado (`yyyy-MM-dd`). La nómina usa el rango, no `fecha`. */
  readonly fecha_desde?: string | null;
  readonly fecha_hasta?: string | null;
  readonly comentario?: string | null;
  /** Neto a pagar: devengado − deducción. */
  readonly total?: string | number | null;
  /** Empleado: identificación y nombre corto, aplanados desde el contacto. */
  readonly contacto_numero_identificacion?: string | null;
  readonly contacto_nombre_corto?: string | null;
  /** Contrato que originó la nómina. */
  readonly contrato_id?: number | null;
  /** Línea de la programación que la generó (trazabilidad del proceso). */
  readonly programacion_detalle_id?: number | null;
  /** Salario base del contrato al momento de liquidar. */
  readonly salario?: string | number | null;
  /** Ingreso base de prestaciones (IBP). */
  readonly base_prestacion?: string | number | null;
  /** Ingreso base de cotización (IBC). */
  readonly base_cotizacion?: string | number | null;
  /** Suma de los conceptos que suman. */
  readonly devengado?: string | number | null;
  /** Suma de los conceptos que restan. */
  readonly deduccion?: string | number | null;
  /** Código único de la nómina electrónica, si ya se emitió. */
  readonly cue?: string | null;
}

/**
 * Línea de nómina: un **concepto** liquidado (salario, auxilio, préstamo,
 * retención…). Vive en `/general/documento-detalle/` como toda línea del
 * framework, pero con los campos de la familia humano en vez de ítem/impuestos.
 *
 * `operacion` dice cómo entra el concepto al total: `1` suma (devengado),
 * `-1` resta (deducción), `0` es neutro — informativo, no afecta el total.
 *
 * **Supuestos pendientes de confirmar con backend**: todos los campos propios
 * de la familia (`concepto_*`, `credito_id`, `porcentaje`, `dias`, `hora`,
 * `operacion`, `devengado`, `deduccion`, las tres bases), tomados del legacy.
 */
export interface NominaDetalleRead {
  readonly id: number;
  readonly concepto_id?: number | null;
  readonly concepto_nombre?: string | null;
  /** Texto libre que el proceso escribe al liquidar (p. ej. el rango de días). */
  readonly detalle?: string | null;
  /** Crédito descontado en esta línea, si el concepto es una cuota. */
  readonly credito_id?: number | null;
  readonly porcentaje?: string | number | null;
  /** Cantidad de horas del concepto. */
  readonly cantidad?: string | number | null;
  readonly dias?: string | number | null;
  /** Valor de la hora aplicado. */
  readonly hora?: string | number | null;
  /** Sentido del concepto: 1 suma, -1 resta, 0 neutro. */
  readonly operacion?: number | null;
  readonly devengado?: string | number | null;
  readonly deduccion?: string | number | null;
  readonly base_prestacion?: string | number | null;
  readonly base_cotizacion?: string | number | null;
  readonly base_impuesto?: string | number | null;
}
