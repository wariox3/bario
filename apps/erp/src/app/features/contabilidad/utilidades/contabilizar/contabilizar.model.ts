/**
 * Modelo de la utilidad **Contabilizar** (módulo Contabilidad).
 *
 * La pantalla cubre dos operaciones opuestas sobre `/general/documento/`:
 *
 * - **Contabilizar**: lista los documentos pendientes y manda los
 *   seleccionados. Los ids viajan **todos en una sola petición**, a diferencia
 *   de las utilidades electrónicas, que hacen un request por documento.
 * - **Descontabilizar**: no opera sobre la selección sino sobre un **rango**
 *   (fechas, números, tipo). Ver `SUGERENCIAS.md` de esta carpeta: es un port
 *   fiel del ERP anterior, con la advertencia de que el usuario no ve qué se va
 *   a revertir.
 *
 * **Supuestos pendientes de confirmar con backend** (portados del legacy): los
 * paths `contabilizar/` y `descontabilizar/`, que ambos reciban `{ ids }`, y
 * que el listado se acote con los tres filtros permanentes de
 * `contabilizar.constants.ts`.
 */

/**
 * Fila del listado. Subconjunto de la cabecera de documento: identificación,
 * tercero y el desglose fiscal.
 *
 * El empleado/tercero llega como `contacto_nombre` siguiendo la convención de
 * `DocumentoListRowBase` que ya usan las demás utilidades del ERP; el legacy lo
 * tipaba como `contacto_nombre_corto`.
 */
export interface ContabilizarRow {
  readonly id: number;
  readonly documento_tipo_nombre: string | null;
  readonly numero: number | string | null;
  /** Fecha del documento (`yyyy-MM-dd`). */
  readonly fecha: string | null;
  readonly contacto_nombre: string | null;
  readonly subtotal: number | string | null;
  readonly impuesto: number | string | null;
  readonly total: number | string | null;
}

/**
 * Criterio de descontabilización. El periodo es obligatorio; número y tipo
 * acotan opcionalmente.
 */
export interface DescontabilizarCriterio {
  /** Inicio del periodo (`yyyy-MM-dd`). */
  readonly fecha_desde: string;
  /** Fin del periodo (`yyyy-MM-dd`). */
  readonly fecha_hasta: string;
  readonly numero_desde: number | null;
  readonly numero_hasta: number | null;
  readonly documento_tipo_id: number | null;
}
