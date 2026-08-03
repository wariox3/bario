/**
 * Fila del informe **Cuentas por pagar**
 * (`POST /general/documento-informe/lista/`, `informe: 'cuenta_pagar'`).
 *
 * Es un `documento` de tesorería (cuentas por pagar) aplanado con datos del tipo
 * de documento y del contacto, más los montos y el saldo pendiente. El backend
 * acota el informe a documentos por pagar, aprobados y con saldo pendiente
 * (`pendiente > 0`) — esos filtros base los encapsula el identificador del
 * informe (antes viajaban como `documento_tipo__pagar` / `estado_aprobado` /
 * `pendiente__gt`).
 *
 * Convención del backend: los ids viajan como `number`; los montos como
 * `string` con cola de decimales (`"17114747.958000"`); las fechas como
 * `yyyy-MM-dd`.
 *
 * **Supuesto pendiente de confirmar con backend**: el endpoint
 * `documento-informe`, el identificador `cuenta_pagar` y los nombres aplanados
 * siguen la convención de `cuenta_cobrar`; el informe viejo consultaba
 * `general/documento` con `serializador=informe_cuenta_pagar`.
 */
export interface CuentaPagar {
  readonly id: number;
  readonly documento_tipo_id: number | null;
  readonly documento_tipo_nombre: string | null;
  readonly numero: number | string | null;
  /** Fecha del documento (`yyyy-MM-dd`). */
  readonly fecha: string | null;
  /** Fecha de vencimiento (`yyyy-MM-dd`). */
  readonly fecha_vence: string | null;
  readonly contacto_id: number | null;
  readonly contacto_numero_identificacion: string | null;
  readonly contacto_nombre_corto: string | null;
  /** Base gravable del documento. */
  readonly subtotal: string | null;
  /** Impuestos del documento. */
  readonly impuesto: string | null;
  /** Total del documento (subtotal + impuesto). */
  readonly total: string | null;
  /** Monto ya cruzado/pagado del documento. */
  readonly afectado: string | null;
  /** Saldo aún pendiente por pagar (`total - afectado`). */
  readonly pendiente: string | null;
}
