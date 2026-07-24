/**
 * Modelo de la utilidad **Eventos DIAN** (módulo Compra).
 *
 * Gestiona la **recepción de documentos electrónicos de proveedores** y el
 * envío de los eventos de acuse a la DIAN (recibo del documento, recibo del
 * bien/servicio y aceptación). Lista documentos `documento_tipo_id = 5` con el
 * serializador `evento_compra`, que trae el estado de cada uno de los tres
 * eventos del ciclo.
 *
 * Convención del backend: montos como `string` con cola de decimales; fechas
 * como `string` (`yyyy-MM-dd`).
 *
 * **Supuestos pendientes de confirmar con backend** (portados del legacy):
 *  - El listado acepta `serializador: 'evento_compra'` y devuelve los campos
 *    `contacto__numero_identificacion`, `contacto__nombre_corto`,
 *    `evento_documento`, `evento_recepcion`, `evento_aceptacion`.
 *  - Endpoints `emitir/`, `emitir-evento/`, `electronico_descartar/`,
 *    `actualizar/`.
 */

/**
 * Código de estado de un evento DIAN. `none` es el sentinel local para "sin
 * estado" (campo vacío/nulo) — evita fallos de traducción en la columna `enum`.
 */
export type EventoDianEstado = 'PE' | 'RZ' | 'RC' | 'AC' | 'RM' | 'EM' | 'none';

/** Códigos de evento válidos que devuelve el backend. */
const CODIGOS_VALIDOS: readonly EventoDianEstado[] = ['PE', 'RZ', 'RC', 'AC', 'RM', 'EM'];

/** Fila cruda del listado (serializador `evento_compra`). */
export interface EventosDianRow {
  readonly id: number;
  readonly numero: string | null;
  readonly fecha: string | null;
  /** Código interno del contacto (columna "Código" del legacy). */
  readonly contacto: number | null;
  readonly contacto__numero_identificacion: string | null;
  readonly contacto__nombre_corto: string | null;
  readonly referencia_prefijo: string | null;
  readonly referencia_numero: string | number | null;
  readonly referencia_cue: string | null;
  readonly total: string | null;
  readonly estado_electronico: boolean;
  /** Estado del evento de recibo del documento (`PE`/`RC`/`RZ`/…). */
  readonly evento_documento: string | null;
  /** Estado del evento de recibo del bien o servicio. */
  readonly evento_recepcion: string | null;
  /** Estado del evento de aceptación de la factura. */
  readonly evento_aceptacion: string | null;
}

/**
 * Fila enriquecida con los códigos de evento normalizados que leen las columnas
 * `enum`. Se calcula al mapear la respuesta.
 */
export interface EventosDianViewRow extends EventosDianRow {
  readonly evento_documento_estado: EventoDianEstado;
  readonly evento_recepcion_estado: EventoDianEstado;
  readonly evento_aceptacion_estado: EventoDianEstado;
}

/** Normaliza un código crudo a uno conocido, o `none` si está vacío/no reconocido. */
export function normalizarEstadoEvento(codigo: string | null): EventoDianEstado {
  return codigo && (CODIGOS_VALIDOS as readonly string[]).includes(codigo)
    ? (codigo as EventoDianEstado)
    : 'none';
}
