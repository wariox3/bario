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
 * Resumen de qué pasó con cada master/catálogo durante la importación
 * (registros creados/actualizados, referencias resueltas, etc.).
 * Shape mínimo, pensado para crecer.
 */
export interface MasterTouched {
  readonly entity: string;
  readonly created: number;
  readonly updated: number;
}
