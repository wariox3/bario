/**
 * Tipo de documento (`GenDocumentoTipo`).
 *
 * Catálogo **normativo**: los tipos los siembra el backend por fixture y no se
 * crean ni se borran desde la API. Lo único que cada tenant configura es su
 * numeración (`consecutivo`) y las contrapartidas de cartera de su plan de
 * cuentas, y eso es exactamente lo que acepta el PATCH.
 *
 * **Las FK van sin sufijo `_id`** al escribir (`cuenta_cobrar`, no
 * `cuenta_cobrar_id`): así las nombra el schema. Con el sufijo DRF descarta el
 * campo en silencio —no guarda y no hay error que lo delate—.
 */
export interface DocumentoTipo {
  readonly id: number;
  readonly nombre: string;
  readonly consecutivo: number;
  readonly venta: boolean;
  readonly compra: boolean;
  /** Resolución asociada. **Solo lectura**: el PATCH del tipo no la acepta. */
  readonly resolucion: number | null;
  readonly resolucion_numero: string;
  /**
   * Prefijo de la resolución. **Todavía no lo manda el backend**: `GenDocumentoTipo`
   * expone `resolucion` y `resolucion_numero`, no este. Va opcional para que la
   * columna renderice vacía hoy y se encienda sola cuando el serializer lo sume,
   * sin tocar el front.
   */
  readonly resolucion_prefijo?: string | null;
  readonly cuenta_cobrar: number | null;
  readonly cuenta_cobrar_codigo: string;
  readonly cuenta_cobrar_nombre: string;
  readonly cuenta_pagar: number | null;
  readonly cuenta_pagar_codigo: string;
  readonly cuenta_pagar_nombre: string;
}

/**
 * Fila tal como la pinta la tabla: el tipo más las dos cuentas ya aplanadas a
 * `código - nombre`. Se arma en el mapper para que la celda vacía quede vacía.
 */
export interface DocumentoTipoRow extends DocumentoTipo {
  readonly cuenta_cobrar_label: string;
  readonly cuenta_pagar_label: string;
}

/**
 * Lo escribible de un tipo de documento (`PatchedGenDocumentoTipoActualizarRequest`).
 * Los demás campos no están acá porque el backend no los acepta, no por una
 * regla del front.
 */
export interface DocumentoTipoPayload {
  readonly consecutivo: number;
  readonly cuenta_cobrar: number | null;
  readonly cuenta_pagar: number | null;
  /**
   * **El backend todavía NO acepta este campo.**
   * `PatchedGenDocumentoTipoActualizarRequest` declara solo `consecutivo`,
   * `cuenta_cobrar` y `cuenta_pagar`, y `resolucion` figura `readOnly` en la
   * lectura. DRF descarta en silencio lo que no declara: hoy elegir resolución
   * y guardar responde 200 sin haber cambiado nada. Se manda igual para que
   * empiece a funcionar el día que el serializer lo sume, sin tocar el front.
   */
  readonly resolucion: number | null;
}

/** Respuesta del PATCH (`GenDocumentoTipoActualizar`): devuelve solo lo escrito. */
export interface DocumentoTipoActualizado extends DocumentoTipoPayload {
  readonly id: number;
}
