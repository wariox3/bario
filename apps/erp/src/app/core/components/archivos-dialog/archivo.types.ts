/**
 * Archivo adjunto tal como lo sirve `general/archivo/`.
 *
 * El backend devuelve algunos campos más (`tipo`, `almacenamiento_id`); acá solo
 * viven los que la ficha muestra o necesita para operar.
 */
export interface Archivo {
  readonly id: number;
  /** Fecha de carga en ISO. */
  readonly fecha: string;
  readonly nombre: string;
  /** Tamaño en bytes. */
  readonly tamano: number;
}

/**
 * A qué se adjunta el archivo. El backend distingue dos dueños posibles: un
 * documento transaccional o un registro de un master cualquiera.
 *
 * Es una unión discriminada y no dos campos opcionales porque los dos modos son
 * **excluyentes**: el ERP anterior los pasaba como `@Input` sueltos
 * (`documentoId` por un lado, `modeloNombre` + `codigo` por el otro) y resolvía
 * con un `if/else` que nada impedía dejar sin rama. Acá el estado inválido —los
 * dos a la vez, o ninguno— no se puede ni escribir, y la traducción a
 * query-params vive en un solo lugar (`ArchivoService`).
 */
export type ArchivoOwner =
  | { readonly kind: 'documento'; readonly documentoId: number }
  | { readonly kind: 'modelo'; readonly modelo: string; readonly codigo: number };
