import type { DocumentoReadBase } from '@reddoc/core';

/**
 * Cabecera de un **aporte a seguridad social** (`documento_tipo_id = 22`) leído
 * desde `GET /general/documento/:id/`.
 *
 * No confundir con el **proceso** `proceso/aporte/`: aquel es la planilla PILA
 * del periodo, con sus contratos, detalles y entidades. Este es el documento por
 * empleado que queda como resultado, y comparte casi toda su cabecera con la
 * nómina — el mismo periodo, el mismo contrato, las mismas bases.
 *
 * La `fecha` (inicio del periodo) la aporta `DocumentoReadBase`, y las banderas
 * de estado vienen de `DocumentoEstados`.
 *
 * **Supuestos pendientes de confirmar con backend**, tomados del ERP legacy:
 * todos los campos propios de la familia humano y los `contacto_*` aplanados.
 * El legacy además lee por `GET …/:id/detalle/` y saca `respuesta.documento`;
 * acá se usa el `getById` plano del gateway, como las otras dos fichas del
 * módulo. Ver `PENDIENTES §8`.
 */
export interface SeguridadSocialRead extends DocumentoReadBase {
  /** Consecutivo del documento. */
  readonly numero?: string | null;
  /** Fin del periodo. El inicio es `fecha`. */
  readonly fecha_hasta?: string | null;
  /** Empleado: identificación y nombre corto, aplanados desde el contacto. */
  readonly contacto_numero_identificacion?: string | null;
  readonly contacto_nombre_corto?: string | null;
  /** Contrato que originó el aporte. */
  readonly contrato_id?: number | null;
  /** Línea de la programación que lo generó (trazabilidad del proceso). */
  readonly programacion_detalle_id?: number | null;
  /** Salario base del contrato al momento de liquidar. */
  readonly salario?: string | number | null;
  /** Ingreso base de cotización (IBC). */
  readonly base_cotizacion?: string | number | null;
  /** Ingreso base de prestaciones (IBP). */
  readonly base_prestacion?: string | number | null;
  readonly devengado?: string | number | null;
  readonly deduccion?: string | number | null;
  /** Total aportado. */
  readonly total?: string | number | null;
  /** Código único, si el documento se emitió electrónicamente. */
  readonly cue?: string | null;
}

/**
 * Línea del aporte: **una descripción y un monto**, nada más.
 *
 * Es lo que separa a este documento de la nómina, con la que comparte casi toda
 * la cabecera: el concepto de nómina lleva `operacion`, `porcentaje`, `dias`,
 * `hora` y tres bases; acá alcanza con qué se pagó y cuánto. Por eso no reusa
 * `nomina-conceptos-table` y trae su propia tabla, más simple.
 *
 * **Supuestos pendientes de confirmar con backend**: los tres campos.
 */
export interface SeguridadSocialDetalleRead {
  readonly id: number;
  /** Descripción de lo aportado (la entidad y su concepto). */
  readonly detalle?: string | null;
  /** Monto aportado por esta línea. */
  readonly pago?: string | number | null;
}
