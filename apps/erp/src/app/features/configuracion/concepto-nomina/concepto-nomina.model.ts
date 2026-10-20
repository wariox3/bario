/**
 * Concepto de nómina (`HumConceptoNomina`).
 *
 * Rubros fijos que el motor de nómina necesita resolver (salario, nocturna,
 * auxilio de transporte, prima…), sembrados por el backend. Cada empresa decide
 * qué concepto de su catálogo usa para cada uno.
 */
export interface ConceptoNomina {
  readonly id: number;
  readonly nombre: string;
  readonly concepto: number | null;
  readonly concepto_nombre: string | null;
}

export interface ConceptoNominaPayload {
  readonly concepto: number;
}
