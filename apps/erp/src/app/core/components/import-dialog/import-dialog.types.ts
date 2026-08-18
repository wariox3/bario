/**
 * Configuración del botón "Descargar ejemplo" del `ImportDialogComponent`.
 *
 * El consumidor decide los 3 estados visibles del botón:
 * - **null** → el botón NO se renderiza (oculto).
 * - **`{ mode: 'enabled', endpoint, filename? }`** → visible y funcional.
 *   El dialog hace la descarga GET contra `endpoint` reusando
 *   `FileDownloadService` de `@reddoc/core` (cookies + `X-Tenant` automáticos).
 * - **`{ mode: 'disabled', reason }`** → visible pero deshabilitado, con
 *   tooltip mostrando `reason` (ej. "Plantilla no configurada para este tenant").
 */
export type ExampleConfig =
  | { readonly mode: 'enabled'; readonly endpoint: string; readonly filename?: string }
  | { readonly mode: 'disabled'; readonly reason: string };

/**
 * Error individual reportado por el backend tras importar.
 * Shape mínimo, pensado para crecer cuando el backend defina su contrato.
 *
 * `row` es opcional: hay fases (encabezados/estructural) cuyos errores no están
 * asociados a una fila concreta del archivo.
 */
export interface ImportError {
  readonly row?: number;
  readonly field?: string;
  readonly message: string;
}

/**
 * Identificadores de los **maestros**: los archivos de referencia que el usuario
 * descarga para saber qué códigos escribir en su archivo de importación.
 *
 * Cada id tiene dos contrapartes que TypeScript obliga a mantener en sincronía:
 *  - su URL, en `IMPORT_MASTER` (`import-masters.constant.ts`);
 *  - su nombre traducido, en `common.import.masters.names` del diccionario.
 *
 * Agregar un maestro = sumar el id acá, su URL en la constante y su nombre en
 * los dos diccionarios. Si falta cualquiera de las tres, el build lo dice.
 */
export type ImportMasterId =
  | 'ciudad'
  | 'comprobanteCodigo'
  | 'comprobante'
  | 'impuesto'
  | 'banco'
  | 'cuentaBancoClase'
  | 'activoGrupo'
  | 'metodoDepreciacion'
  | 'tipoCotizante'
  | 'subtipoCotizante'
  | 'entidad'
  | 'tipoContrato'
  | 'costoTipo';

/**
 * Un maestro concreto tal como lo consume el diálogo: qué es (`id`, del que sale
 * su nombre traducido) y de dónde se baja (`url`).
 *
 * El consumidor nunca escribe esta estructura a mano — declara
 * `[IMPORT_MASTER.ciudad, IMPORT_MASTER.banco]` y con eso la URL queda en un
 * único lugar del código.
 */
export interface ImportMaster {
  readonly id: ImportMasterId;
  /** URL absoluta y pública del XLSX. Se abre en una pestaña nueva. */
  readonly url: string;
}
