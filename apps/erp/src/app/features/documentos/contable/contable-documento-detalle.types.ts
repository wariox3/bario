import type { ErpSelectOption } from '@reddoc/core';

/**
 * Naturaleza contable de una línea de cuenta: **D**ébito o **C**rédito.
 * Determina en qué acumulador (débitos/créditos) suma su valor.
 */
export type NaturalezaCuenta = 'D' | 'C';

/**
 * Valores crudos de una línea de **cuenta contable** (`form.getRawValue()` de cada
 * `FormGroup` del `FormArray` de cuentas). A diferencia de la línea comercial
 * (ítem de inventario), una línea de cuenta es un **asiento manual** directo a una
 * cuenta del PUC con su naturaleza y valor.
 *
 * `cuenta` + `naturaleza` + `valor` son el núcleo que usa cualquier documento con
 * asientos manuales. `contacto`, `centro_costo` y `base` son opcionales **en la UI**
 * (la tabla los muestra solo si el documento los pide vía inputs) pero siempre viven
 * en el grupo: un documento que no los usa los deja en su default nulo. Los usa
 * el pago, cuyas líneas imputan a un tercero y a un centro de costo.
 */
export interface CuentaDetalleFormRawValue {
  /** Id de la línea persistida (`null` mientras no exista en backend). */
  readonly id: number | null;
  /** Cuenta contable imputada (`{ id, nombre }`, nombre = `código - nombre`). */
  readonly cuenta: ErpSelectOption | null;
  readonly naturaleza: NaturalezaCuenta;
  /** Valor imputado a la cuenta. */
  readonly valor: number | null;
  /** Tercero de la línea. `null` en los documentos que no imputan por contacto. */
  readonly contacto: ErpSelectOption | null;
  /** Centro de costo (`contabilidad/centro-costo`). `null` si el documento no lo imputa. */
  readonly centro_costo: ErpSelectOption | null;
  /** Base gravable de la línea. `0` cuando no aplica. */
  readonly base: number | null;
}

/** Acumulado de débitos y créditos de las líneas de cuenta del documento. */
export interface ResumenContable {
  readonly debitos: number;
  readonly creditos: number;
  /**
   * Neto del documento (`créditos − débitos`). En un recaudo es la plata que
   * efectivamente entra: los créditos abonan la cartera y los débitos la
   * descuentan (descuentos, retenciones).
   */
  readonly total: number;
}
