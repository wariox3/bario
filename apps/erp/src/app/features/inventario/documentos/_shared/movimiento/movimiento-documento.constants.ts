/**
 * Campo del ítem con el que se valoriza cada línea al elegirlo en el formulario.
 *
 * `costo` es el costo de reposición del ítem; `costo_promedio`, el promedio
 * ponderado de las existencias.
 */
export type CostoField = 'costo' | 'costo_promedio';

/**
 * De dónde sale el costo de la línea, por documento.
 *
 * Réplica del ERP legacy: la **entrada** y el **traslado** valorizan al `costo`
 * del ítem (lo que cuesta reponerlo), mientras que la **salida** usa el
 * `costo_promedio` (lo que costó en promedio lo que sale del almacén). No se
 * deriva de `inventoryEffect` justamente porque el traslado rompería la regla.
 *
 * La clave es el `id` del `DocumentEntityConfig`; los documentos que no figuren
 * caen al default `'costo'`.
 */
const COSTO_FIELD_BY_DOCUMENT: Readonly<Record<string, CostoField>> = {
  entrada: 'costo',
  salida: 'costo_promedio',
};

/** Campo de costo del documento indicado; `'costo'` si no declara otro. */
export function costoFieldFor(documentId: string): CostoField {
  return COSTO_FIELD_BY_DOCUMENT[documentId] ?? 'costo';
}
