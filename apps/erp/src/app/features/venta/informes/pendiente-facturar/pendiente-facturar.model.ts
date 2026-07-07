/**
 * Fila del informe **Pendiente por facturar**
 * (`POST /general/documento-detalle-informe/lista/`, `informe: 'pendiente_facturar'`).
 *
 * Es una línea de `documento-detalle` aplanada con datos del documento padre
 * (número, fecha, tipo, contacto) y de los catálogos (ítem, puesto, modalidad)
 * que el backend expande para el informe. Convención del backend: los ids viajan
 * como `number`; los montos y las horas como `string` con cola de decimales
 * (`"17114747.958000"`, `"576.00"`); `detalle` puede venir `null`.
 */
export interface PendienteFacturar {
  readonly id: number;
  /** FK e identificación visible del documento padre. */
  readonly documento_id: number;
  readonly documento_numero: number | string | null;
  /** Fecha del documento (`yyyy-MM-dd`). */
  readonly documento_fecha: string | null;
  readonly documento_tipo_id: number | null;
  readonly documento_tipo_nombre: string | null;
  readonly contacto_id: number | null;
  readonly contacto_nombre: string | null;
  readonly item_id: number | null;
  readonly item_nombre: string | null;
  readonly puesto_id: number | null;
  readonly puesto_nombre: string | null;
  readonly modalidad_id: number | null;
  readonly modalidad_nombre: string | null;
  readonly modalidad_codigo: string | null;
  readonly detalle: string | null;
  /** Cantidad de la línea (string decimal, p. ej. `"1.000000"`). */
  readonly cantidad: string | null;
  /** Valor de la línea (precio × cantidad, base). */
  readonly precio: string | null;
  /** Total de la línea (con impuestos). */
  readonly total: string | null;
  /** Monto ya facturado/afectado de la línea. */
  readonly afectado: string | null;
  /** Monto aún pendiente por facturar (`total - afectado`). */
  readonly pendiente: string | null;
  /** Horas totales de cobertura (`horas = horas_diurnas + horas_nocturnas`). */
  readonly horas: string | null;
  readonly horas_diurnas: string | null;
  readonly horas_nocturnas: string | null;
}
