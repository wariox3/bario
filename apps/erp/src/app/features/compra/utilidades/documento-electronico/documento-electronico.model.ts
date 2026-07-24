/**
 * Modelo de la utilidad **Documento electrónico** (módulo Compra).
 *
 * Lista cabeceras de documento (`/general/documento/`) acotadas a los tipos
 * electrónicos del grupo de compra que están aprobados y pendientes de emitir a
 * la DIAN. A diferencia de la utilidad de venta (grupo de facturas, un solo
 * tipo), compra agrupa **varios tipos electrónicos** —por eso la fila expone el
 * `documento_tipo_nombre`— y el flujo se reduce a una sola acción: **emitir**.
 *
 * Convención del backend: los montos viajan como `string` con cola de
 * decimales (`"18817299.435000"`); las fechas como `string` (`yyyy-MM-dd`).
 *
 * **Supuestos pendientes de confirmar con backend** (portados del legacy):
 *  - Las banderas `estado_electronico*` viajan en la fila del listado.
 *  - El discriminador es `documento_tipo__electronico = true` +
 *    `documento_tipo__documento_clase__grupo = 3`.
 */

/** Estado electrónico derivado que pinta el badge de la columna "Estado". */
export type DocumentoElectronicoEstado = 'enviado' | 'pendiente';

/**
 * Fila del listado de la utilidad. Subconjunto de `DocumentoListRowBase` más la
 * bandera `estado_electronico_enviado`, que decide el badge y si la fila es
 * seleccionable para emitir.
 */
export interface DocumentoElectronicoRow {
  readonly id: number;
  readonly numero: string | null;
  readonly fecha: string | null;
  readonly documento_tipo_nombre: string | null;
  readonly contacto_nombre: string | null;
  readonly total: string | null;
  readonly estado_electronico_enviado: boolean;
}

/**
 * Fila enriquecida con el estado derivado (`estado_electronico_estado`). La
 * columna "Estado" lo lee como `enum` para traducir el label; se calcula al
 * mapear la respuesta.
 */
export interface DocumentoElectronicoViewRow extends DocumentoElectronicoRow {
  readonly estado_electronico_estado: DocumentoElectronicoEstado;
}

/**
 * Deriva el estado electrónico visible, replicando la lógica del legacy: si ya
 * se envió a la DIAN queda "esperando respuesta" (`enviado`); si no, sigue
 * `pendiente` (aún emitible).
 */
export function resolverEstadoElectronico(
  row: DocumentoElectronicoRow,
): DocumentoElectronicoEstado {
  return row.estado_electronico_enviado ? 'enviado' : 'pendiente';
}
