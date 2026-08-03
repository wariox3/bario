/**
 * Modelo de la utilidad **Enviar factura electrónica** (módulo Venta).
 *
 * La utilidad opera sobre cabeceras de documento (`/general/documento/`)
 * acotadas al grupo de facturas, gestionando el ciclo de facturación
 * electrónica DIAN: **emitir** (enviar a la DIAN) y **notificar** (avisar al
 * cliente). Ambos tabs listan documentos con el mismo shape reducido; solo
 * cambian los filtros permanentes y las acciones disponibles.
 *
 * Convención del backend: los montos viajan como `string` con cola de
 * decimales (`"18817299.435000"`); las fechas como `string` (`yyyy-MM-dd`).
 *
 * **Supuestos pendientes de confirmar con backend** (portados del legacy):
 *  - Las banderas `estado_electronico*` viajan en la fila del listado.
 *  - El discriminador de facturas sigue siendo
 *    `documento_tipo__documento_clase__grupo = 1`.
 */

/** Estado electrónico derivado que pinta el badge de la columna "Estado". */
export type DocumentoElectronicoEstado = 'descartado' | 'enviado' | 'pendiente';

/**
 * Fila del listado de la utilidad. Es un subconjunto de `DocumentoListRowBase`
 * más las banderas del ciclo electrónico que la UI necesita para el badge y
 * para restringir la selección.
 */
export interface DocumentoElectronicoRow {
  readonly id: number;
  readonly numero: string | null;
  readonly fecha: string | null;
  readonly contacto_nombre: string | null;
  readonly total: string | null;
  readonly estado_electronico: boolean;
  readonly estado_electronico_enviado: boolean;
  readonly estado_electronico_notificado: boolean;
  readonly estado_electronico_descartado: boolean;
}

/**
 * Fila enriquecida con el estado derivado (`estado_electronico_estado`). La
 * columna "Estado" del tab Emitir lee este campo como `enum` para traducir el
 * label; se calcula en el componente al mapear la respuesta.
 */
export interface DocumentoElectronicoViewRow extends DocumentoElectronicoRow {
  readonly estado_electronico_estado: DocumentoElectronicoEstado;
}

/**
 * Deriva el estado electrónico visible de una fila, replicando la lógica del
 * legacy: descartado tiene prioridad; luego "enviado" (esperando respuesta de
 * la DIAN); si no, "pendiente" (aún emitible).
 */
export function resolverEstadoElectronico(
  row: DocumentoElectronicoRow,
): DocumentoElectronicoEstado {
  if (row.estado_electronico_descartado) return 'descartado';
  if (row.estado_electronico_enviado) return 'enviado';
  return 'pendiente';
}
