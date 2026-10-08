/**
 * Contratos del kernel de cálculo de totales de documentos.
 *
 * Son el **mínimo común denominador** de cualquier documento con líneas
 * (contrato de servicio, factura de venta, nota crédito, factura POS…): una
 * línea tiene una `base` gravable, un `descuento` opcional y una lista de
 * impuestos ya resueltos. Deliberadamente NO conocen los campos específicos de
 * ningún documento (puesto, salario, horarios…): cada documento traduce su
 * línea a estos tipos con su propio adaptador.
 */

/**
 * Tasa de impuesto aplicable a una línea, ya parseada a número.
 *
 * El parseo de los strings del backend (`"19.00"`) se hace en el borde —el
 * adaptador del documento—, no en el kernel: aquí siempre llegan números.
 */
export interface TasaImpuesto {
  readonly id: number;
  /** Nombre para mostrar del impuesto: el **extendido** (`"IVA 19% ventas"`). */
  readonly nombre: string;
  /** Porcentaje del impuesto: `19` ⇒ 19%. */
  readonly porcentaje: number;
  /** Porcentaje de la base sobre la que aplica: `100` normal, `10` para esquemas tipo AIU. */
  readonly porcentajeBase: number;
  /**
   * Operación del impuesto sobre el total: `1` suma (IVA, consumo…), `-1` resta
   * (retenciones). Ausente ⇒ `1`. Multiplica el monto, así que el `total` de una
   * retención queda **negativo** en `ImpuestoLinea` y el resumen la descuenta solo.
   */
  readonly operacion?: number;
}

/**
 * Monto de un impuesto ya resuelto y redondeado para una línea o el documento.
 * `total` viene **con signo**: negativo cuando el impuesto es una retención
 * (`operacion −1`), así los agregados lo restan sin lógica extra.
 */
export interface ImpuestoLinea {
  readonly id: number;
  /** Nombre para mostrar del impuesto: el **extendido** (`"IVA 19% ventas"`). */
  readonly nombre: string;
  readonly total: number;
}

/** Contrato mínimo de una línea para agregar el resumen del documento. */
export interface LineaCalculo {
  /** Monto gravable de la línea (p. ej. `cantidad × precio`). */
  readonly base: number;
  /** Descuento de la línea. Ausente ⇒ 0. */
  readonly descuento?: number;
  /** Impuestos ya resueltos de la línea (ver `calcularImpuestosLinea`). */
  readonly impuestos: readonly ImpuestoLinea[];
}

/** Resumen financiero de un documento: subtotal, descuento, desglose de impuestos y total. */
export interface ResumenDocumento {
  readonly subtotal: number;
  readonly descuento: number;
  readonly impuestos: readonly ImpuestoLinea[];
  readonly total: number;
}
