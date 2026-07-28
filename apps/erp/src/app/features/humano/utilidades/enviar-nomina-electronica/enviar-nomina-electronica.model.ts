/**
 * Modelo de la utilidad **Enviar nómina electrónica** (módulo Humano).
 *
 * Lista cabeceras de documento (`/general/documento/`) acotadas a las nóminas
 * electrónicas aprobadas y pendientes de emitir a la DIAN. Es el gemelo de las
 * utilidades de venta y compra, con un solo tipo de documento
 * (`documento_tipo_id = 15`) y sin paso de notificación: la nómina se emite y
 * ahí termina el ciclo.
 *
 * Convención del backend: los montos viajan como `string` con cola de
 * decimales (`"1300000.000000"`); las fechas como `string` (`yyyy-MM-dd`).
 *
 * **Supuestos pendientes de confirmar con backend** (portados del legacy):
 *  - Las banderas `estado_electronico*` viajan en la fila del listado.
 *  - El empleado llega como `contacto_nombre`, la convención de
 *    `DocumentoListRowBase` que ya usan las otras dos utilidades. El legacy lo
 *    leía como `contacto_nombre_corto`.
 */

/** Estado electrónico derivado que pinta el badge de la columna "Estado". */
export type NominaElectronicaEstado = 'enviado' | 'pendiente';

/**
 * Fila del listado de la utilidad. Subconjunto de `DocumentoListRowBase` más la
 * bandera `estado_electronico_enviado`, que decide el badge y si la fila se
 * puede emitir.
 */
export interface EnviarNominaElectronicaRow {
  readonly id: number;
  readonly numero: string | null;
  readonly fecha: string | null;
  readonly contacto_nombre: string | null;
  readonly total: string | null;
  readonly estado_electronico_enviado: boolean;
}

/**
 * Fila enriquecida con el estado derivado (`estado_electronico_estado`). La
 * columna "Estado" lo lee como `enum` para traducir el label; se calcula al
 * mapear la respuesta.
 */
export interface EnviarNominaElectronicaViewRow extends EnviarNominaElectronicaRow {
  readonly estado_electronico_estado: NominaElectronicaEstado;
}

/**
 * Deriva el estado electrónico visible: si ya se envió a la DIAN queda
 * "esperando respuesta" (`enviado`); si no, sigue `pendiente` (aún emitible).
 *
 * El legacy contemplaba un tercer badge, "Descartado", inalcanzable: su propio
 * filtro permanente excluía los descartados. Por eso acá solo hay dos estados.
 */
export function resolverEstadoElectronico(
  row: EnviarNominaElectronicaRow,
): NominaElectronicaEstado {
  return row.estado_electronico_enviado ? 'enviado' : 'pendiente';
}
