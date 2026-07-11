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
 * Núcleo mínimo (v1): `cuenta` + `naturaleza` + `valor`. `grupo`, `contacto` y
 * `base` quedan para una iteración posterior.
 */
export interface CuentaDetalleFormRawValue {
  /** Id de la línea persistida (`null` mientras no exista en backend). */
  readonly id: number | null;
  /** Cuenta contable imputada (`{ id, nombre }`, nombre = `código - nombre`). */
  readonly cuenta: ErpSelectOption | null;
  readonly naturaleza: NaturalezaCuenta;
  /** Valor imputado a la cuenta. */
  readonly valor: number | null;
}

/** Acumulado de débitos y créditos de las líneas de cuenta del documento. */
export interface ResumenContable {
  readonly debitos: number;
  readonly creditos: number;
}
