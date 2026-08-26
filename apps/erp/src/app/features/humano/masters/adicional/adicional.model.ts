/**
 * Adicional de empleado (HumAdicional).
 *
 * Concepto adicional (devengado/recargo) atado a un contrato. Shape de lectura
 * del backend: las FK (`contrato`, `concepto`, `programacion`) llegan como id
 * pelado (sin sufijo `_id`) + companion `*_nombre`. `valor` puede llegar como
 * string Decimal → se normaliza a número en el mapper. Los campos `horas`,
 * `permanente` y `programacion` los gestiona el backend / otra pantalla y no se
 * editan desde el formulario.
 */
export interface Adicional {
  readonly id: number;
  readonly valor: string | number | null;
  readonly horas: number | null;
  readonly aplica_dia_laborado: boolean;
  readonly inactivo: boolean;
  readonly permanente: boolean;
  readonly detalle: string | null;
  // Foreign keys (id pelado) + companion `*_nombre`
  readonly contrato: number | null;
  readonly contrato_nombre: string | null;
  /**
   * Cédula del empleado del contrato, para el addon del autocomplete en edición.
   *
   * TODO(backend): nombre **asumido**. El companion del nombre es
   * `contrato_nombre` (que ya es el nombre del empleado, no el del contrato), así
   * que se sigue el mismo patrón `<fk>_<campo>`. Opcional: hasta que el backend lo
   * exponga llega `undefined` y el addon degrada a vacío, como hoy.
   */
  /**
   * Código interno del empleado (el id de su contacto).
   *
   * TODO(backend): **no existe todavía** en la respuesta de `lista/`. El ERP
   * anterior lo servía como `contrato__contacto_id`; acá se sigue la convención
   * `<fk>_<campo>` del resto del modelo. Opcional: hasta que el backend lo
   * exponga llega `undefined` y la columna queda vacía.
   */
  readonly contrato_contacto_id?: number | null;
  readonly contrato_numero_identificacion?: string | null;
  readonly concepto: number | null;
  readonly concepto_nombre: string | null;
  readonly programacion: number | null;
  readonly programacion_nombre: string | null;
}

/**
 * Payload para crear o actualizar un adicional. Solo los campos editables del
 * formulario; las FK van como id pelado.
 */
export interface AdicionalPayload {
  valor: number | null;
  detalle: string | null;
  aplica_dia_laborado: boolean;
  inactivo: boolean;
  contrato: number | null;
  concepto: number | null;
}
