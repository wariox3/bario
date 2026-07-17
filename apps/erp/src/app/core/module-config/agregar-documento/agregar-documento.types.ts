/**
 * Tipos de la feature **agregar documento** (cruce de cartera — camino A, ERP).
 *
 * Permite traer documentos **pendientes de cruce** (cuentas por cobrar o por
 * pagar con `pendiente > 0`) como líneas contables del documento actual
 * (pago/egreso): cada documento elegido se vuelve una línea con
 * `documento_afectado`, `valor = pendiente` y la cuenta/naturaleza del cruce.
 *
 * ⚠️ Contrato **supuesto** a partir del ERP legacy (`serializador=adicionar`
 * sobre `general/documento/`): nombres de campos y tipos sin confirmar con
 * backend. Todo el riesgo queda aislado en este archivo y en el mapper
 * (`documentoPendienteToFormValue`).
 *
 * 💡 Propuesta para backend (reemplaza el hack legacy del tipo 22, donde la
 * cuenta salía del documento y no del tipo): que el serializador `adicionar`
 * devuelva la **cuenta de cruce ya resuelta** por documento —
 * `cuenta_cruce_id` + `cuenta_cruce_codigo` (y opcionalmente la `naturaleza`) —
 * en vez de exponer `documento_tipo__cuenta_cobrar_*`/`_pagar_*` y dejar que el
 * front derive con casos especiales por tipo. Cuando exista, el mapper cambia
 * en un solo lugar.
 */

/** Familia de cartera que alimenta el modal: cuentas por cobrar o por pagar. */
export type CarteraTipo = 'cobrar' | 'pagar';

/**
 * Fila cruda de `POST /general/documento/lista/?serializador=adicionar` para el
 * cruce de cartera. Montos como `string` con cola de decimales
 * (`"120600.000000"`); fechas como `string` `yyyy-MM-dd`.
 */
export interface DocumentoPendienteApi {
  /** Id del documento (cabecera) → futuro `documento_afectado` de la línea. */
  readonly id: number;
  readonly numero: number | null;
  readonly fecha: string;
  readonly fecha_vence: string | null;
  /** FK del tercero del documento. */
  readonly contacto: number;
  readonly contacto__nombre_corto: string;
  readonly subtotal: string;
  readonly impuesto: string;
  readonly total: string;
  /** Valor ya cruzado por otros documentos. */
  readonly afectado: string;
  /** Valor pendiente de cruce = total − afectado. Siempre > 0 acá. */
  readonly pendiente: string;
  readonly documento_tipo: number;
  readonly documento_tipo__nombre: string;
  /**
   * Operación del tipo (`1` suma cartera, `-1` la resta — p. ej. nota crédito).
   * Define la naturaleza de la línea de cruce (ver mapper).
   */
  readonly documento_tipo_operacion: number;
  /** Cuenta de cruce del tipo (CxC). Presente cuando `carteraTipo = 'cobrar'`. */
  readonly documento_tipo__cuenta_cobrar_id?: number | null;
  readonly documento_tipo__cuenta_cobrar__codigo?: string | null;
  /** Cuenta de cruce del tipo (CxP). Presente cuando `carteraTipo = 'pagar'`. */
  readonly documento_tipo__cuenta_pagar_id?: number | null;
  readonly documento_tipo__cuenta_pagar__codigo?: string | null;
}

/**
 * Datos de entrada del modal (`DynamicDialogConfig.data`). El consumidor (la
 * tabla de detalles contable) pasa el contacto de la cabecera para acotar los
 * pendientes y la familia de cartera que aplica a su documento.
 */
export interface AgregarDocumentoModalData {
  /** Contacto de la cabecera; filtra los pendientes (el modal puede quitarlo). */
  readonly contactoId: number | null;
  /** `'cobrar'` en el pago (recaudo); `'pagar'` en el futuro egreso. */
  readonly carteraTipo: CarteraTipo;
}
