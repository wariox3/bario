import type { DocumentoDetalleReadBase } from '@reddoc/core';
import type { NaturalezaCuenta } from './contable-documento-detalle.types';

/**
 * Modelos de lectura/escritura de una línea de **cuenta contable**, transversales
 * a los documentos que soporten asientos manuales. Comparten el endpoint
 * `/general/documento-detalle/` con las líneas comerciales; el backend las
 * discrimina por `tipo_registro` (`'C'` = cuenta, `'I'`/otros = ítem).
 *
 * ⚠️ Contrato **supuesto** a partir del ERP legacy (nombres de campos, tipos,
 * cómo se envían/devuelven). Todo el riesgo del contrato queda aislado en este
 * archivo y en el mapper: cuando el backend confirme, se ajusta en un solo lugar.
 */

/** Línea de cuenta leída desde la API en edición. */
export interface CuentaDetalleRead extends DocumentoDetalleReadBase {
  /** Discriminador de familia de línea; `'C'` para cuentas contables. */
  readonly tipo_registro?: string | null;
  /** FK de la cuenta contable imputada. */
  readonly cuenta?: number | null;
  readonly cuenta_codigo?: string | null;
  readonly cuenta_nombre?: string | null;
  /** Naturaleza contable (`'D'`/`'C'`); el mapper cae a `'D'` si viene ausente. */
  readonly naturaleza?: string | null;
  /** Tercero de la línea (solo lo imputan los documentos que agrupan por contacto). */
  readonly contacto?: number | null;
  readonly contacto_nombre_corto?: string | null;
  /** FK del centro de costo (`contabilidad/centro-costo`). */
  readonly centro_costo?: number | null;
  readonly centro_costo_nombre?: string | null;
  /** Base gravable de la línea; llega como string con decimales. */
  readonly base?: string | null;
  /** Número de referencia libre de la línea (solo lo imputa el asiento manual). */
  readonly numero?: number | string | null;
  /** Glosa libre de la línea. */
  readonly detalle?: string | null;
  /**
   * Documento cruzado por la línea (cabecera afectada); `null` en asientos
   * manuales.
   *
   * TODO(backend): los tres **no vienen** en el serializer. `GenDocumentoDetalle`
   * (verificado en `GET /contenedor/schema/`) solo expone
   * `documento_detalle_afectado`, que es la línea cruzada, no la cabecera.
   * Están pedidos con estos nombres, los del ERP anterior, que los leía así en
   * la ficha del egreso y del pago. Mientras no lleguen, las tres columnas de la
   * ficha del egreso pintan `—`: el mapper ya las deja en `null`.
   */
  readonly documento_afectado?: number | null;
  readonly documento_afectado_numero?: string | number | null;
  readonly documento_afectado_documento_tipo_nombre?: string | null;
}

/** Cuerpo de una línea de cuenta enviada en `POST`/`PATCH`. */
export interface CuentaDetallePayload {
  /** Marca la línea como asiento contable (no ítem). */
  readonly tipo_registro: 'C';
  /** Las líneas de cuenta no referencian un ítem de inventario. */
  readonly item: null;
  readonly cuenta: number | null;
  readonly naturaleza: NaturalezaCuenta;
  /** Valor como string con 2 decimales (`"150000.00"`). */
  readonly precio: string;
  /** Total de la línea; sin impuestos por línea coincide con `precio`. */
  readonly total: string;
  /** Tercero de la línea; `null` en los documentos que no imputan por contacto. */
  readonly contacto: number | null;
  /** Centro de costo; `null` si el documento no lo imputa. */
  readonly centro_costo: number | null;
  /** Base gravable como string con 2 decimales; `"0.00"` cuando no aplica. */
  readonly base: string;
  /** Número de referencia libre; `null` en los documentos que no lo imputan. */
  readonly numero: number | null;
  /** Glosa libre; `null` en los documentos que no la imputan. */
  readonly detalle: string | null;
  /**
   * Documento cruzado: el backend descuenta su `pendiente` al aprobar. `null`
   * en asientos manuales (líneas libres).
   */
  readonly documento_afectado: number | null;
}
