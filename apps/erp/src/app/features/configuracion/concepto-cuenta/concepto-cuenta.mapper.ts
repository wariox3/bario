import type { ErpSelectOption } from '@reddoc/core';
import { cuentaLabel, cuentaOption } from '../cuenta.mapper';
import type { ConceptoCuenta } from './concepto-cuenta.model';

/** Fila del modal: la cuenta guardada aplanada y lista para sembrar el selector. */
export interface ConceptoCuentaRow extends ConceptoCuenta {
  readonly cuenta_label: string;
  readonly cuenta_option: ErpSelectOption | null;
}

export function toConceptoCuentaRow(conceptoCuenta: ConceptoCuenta): ConceptoCuentaRow {
  return {
    ...conceptoCuenta,
    cuenta_label: cuentaLabel(conceptoCuenta.cuenta_codigo, conceptoCuenta.cuenta_nombre),
    cuenta_option: cuentaOption(
      conceptoCuenta.cuenta,
      conceptoCuenta.cuenta_codigo,
      conceptoCuenta.cuenta_nombre,
    ),
  };
}
