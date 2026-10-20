import type { ErpSelectOption } from '@reddoc/core';
import type { ConceptoNomina, ConceptoNominaPayload } from './concepto-nomina.model';

export interface ConceptoNominaFormValue {
  readonly concepto: ErpSelectOption | null;
}

/** Siembra el concepto actual: el legacy lo dejaba vacío y obligaba a elegirlo otra vez. */
export function conceptoNominaToForm(conceptoNomina: ConceptoNomina): ConceptoNominaFormValue {
  return {
    concepto:
      conceptoNomina.concepto != null
        ? { id: conceptoNomina.concepto, nombre: conceptoNomina.concepto_nombre ?? '' }
        : null,
  };
}

/** Solo se llama con el form válido: el concepto es obligatorio. */
export function conceptoNominaFormToPayload(form: {
  readonly concepto: ErpSelectOption;
}): ConceptoNominaPayload {
  return { concepto: form.concepto.id };
}
