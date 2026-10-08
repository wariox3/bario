/**
 * Tipos de la feature **agregar documento** (cruce de cartera — camino A, ERP).
 *
 * Permite traer documentos **pendientes de cruce** (cuentas por cobrar o por
 * pagar con `pendiente > 0`) como líneas contables del documento actual
 * (pago/egreso): cada documento elegido se vuelve una línea con
 * `documento_afectado`, `valor = pendiente` y la cuenta/naturaleza del cruce.
 *
 * El serializer de `documento/lista/` trae ya resuelto todo lo que necesita el
 * cruce: la **cuenta del tipo** —id, código y nombre, la de CxC o la de CxP— y
 * la **operación del tipo**, la que decide si el documento suma o resta
 * cartera. Con las dos, la línea nace con su cuenta y su naturaleza puestas sin
 * consultar ningún catálogo.
 */

/** Familia de cartera que alimenta el modal: cuentas por cobrar o por pagar. */
export type CarteraTipo = 'cobrar' | 'pagar';

/**
 * Fila cruda de `POST /general/documento/lista/` para el cruce de cartera.
 *
 * Subconjunto de `GenDocumento`, el serializer por defecto del `lista/`: nombres
 * planos con un guion bajo, montos como `string` con cola de decimales
 * (`"17475000.000000"`) y fechas `yyyy-MM-dd`.
 */
export interface DocumentoPendienteApi {
  /** Id del documento (cabecera) → futuro `documento_afectado` de la línea. */
  readonly id: number;
  readonly numero: number | string | null;
  readonly fecha: string | null;
  readonly fecha_vence: string | null;
  readonly documento_tipo_nombre: string | null;
  /** FK del tercero del documento. */
  readonly contacto: number | null;
  readonly contacto_nombre_corto: string | null;
  readonly contacto_numero_identificacion: string | null;
  readonly total: string | null;
  /** Valor ya cruzado por otros documentos. */
  readonly afectado: string | null;
  /** Valor pendiente de cruce (`total − afectado`). Siempre > 0 acá. */
  readonly pendiente: string | null;

  /** Cuenta de cruce del tipo, CxC. */
  readonly documento_tipo_cuenta_cobrar_id: number | null;
  readonly documento_tipo_cuenta_cobrar_codigo: string | null;
  readonly documento_tipo_cuenta_cobrar_nombre: string | null;
  /** Cuenta de cruce del tipo, CxP. */
  readonly documento_tipo_cuenta_pagar_id: number | null;
  readonly documento_tipo_cuenta_pagar_codigo: string | null;
  readonly documento_tipo_cuenta_pagar_nombre: string | null;

  /** Operación del tipo: `1` suma cartera, `-1` la resta (p. ej. nota crédito). */
  readonly documento_tipo_operacion: number | null;
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
