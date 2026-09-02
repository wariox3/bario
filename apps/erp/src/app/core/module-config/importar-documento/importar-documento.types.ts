/**
 * Tipos de la feature **importar desde documento** (camino A — ERP).
 *
 * Permite traer líneas pendientes de otros documentos hacia el `FormArray` de
 * detalles del documento actual. Ver `docs/architecture/importar-desde-documento.md`.
 */

/**
 * Impuesto de una línea pendiente. Mismo shape que `ItemImpuesto`: porcentajes
 * como string (`"19.00"`), sin monto precalculado (el front lo calcula con el
 * kernel `@reddoc/core/calculo`).
 */
export interface LineaPendienteImpuesto {
  /** Id del impuesto (FK). */
  readonly impuesto: number;
  /** Nombre corto (`"IVA"`). Para mostrar se prefiere `impuesto_nombre_extendido`. */
  readonly impuesto_nombre?: string | null;
  /** Nombre para mostrar (`"IVA 19% ventas"`), si el serializador lo manda. */
  readonly impuesto_nombre_extendido?: string | null;
  /** Porcentaje del impuesto, e.g. `"19.00"`. */
  readonly impuesto_porcentaje?: string | null;
  /** Porcentaje de la base sobre la que aplica, e.g. `"100.00"`. */
  readonly impuesto_porcentaje_base?: string | null;
  /**
   * Operación sobre el total: `1` suma, `-1` resta (retención). El serializador
   * de `pendiente/` aún no la documenta (schema verificado el 2026-08-31): si no
   * llega, el mapper asume `1` y una retención importada no resta — gap a
   * confirmar con el backend.
   */
  readonly impuesto_operacion?: number | null;
}

/**
 * Fila cruda del endpoint `POST /general/documento-detalle/pendiente/`.
 *
 * Trae **todo** lo necesario para construir la línea del formulario sin lecturas
 * extra: `item_id`, `precio`, `cantidad` e `impuestos`. Se usa tanto para la UI
 * de selección del modal como para armar la línea importada.
 *
 * Convención del backend: los montos viajan como `string` con cola de decimales
 * (`"16456457.000000"`); la fecha como `string` `yyyy-MM-dd`.
 */
export interface LineaPendienteApi {
  /** Id de la **línea origen** (`documento_detalle`) → futuro `documento_detalle_afectado`. */
  readonly id: number;
  /** Id del documento (cabecera) origen. */
  readonly documento: number;
  /** Número del documento origen (puede venir `null`). */
  readonly numero: number | null;
  /** Fecha del documento origen, `yyyy-MM-dd`. */
  readonly fecha: string;
  readonly contacto_id: number;
  readonly contacto_nombre: string;
  /** Id del ítem de la línea origen. */
  readonly item_id: number;
  /** Nombre del ítem. */
  readonly item_nombre: string;
  /** Cantidad de la línea origen (decimal como string). */
  readonly cantidad: string;
  /** Precio unitario de la línea origen (decimal como string). */
  readonly precio: string;
  /** Valor total de la línea origen (decimal como string). */
  readonly total: string;
  /** Valor ya facturado/afectado (decimal como string). */
  readonly afectado: string;
  /** Valor pendiente = total − afectado (decimal como string). */
  readonly pendiente: string;
  /** Impuestos de la línea origen (para reconstruir los montos en el front). */
  readonly impuestos: readonly LineaPendienteImpuesto[];
}

/**
 * Datos de entrada del modal (`DynamicDialogConfig.data`). El consumidor (la
 * tabla de detalles) pasa el contacto del documento actual para acotar las
 * líneas pendientes a ese contacto.
 */
export interface ImportarDocumentoModalData {
  /** Contacto del documento actual; filtra las pendientes. `null` = sin filtro. */
  readonly contactoId: number | null;
}
