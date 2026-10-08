/**
 * Adicional de empleado (HumAdicional).
 *
 * Concepto adicional (devengado/recargo) atado a un contrato. Shape de lectura
 * del backend: las FK (`contrato`, `concepto`, `programacion`) llegan como id
 * pelado (sin sufijo `_id`) + companion `*_nombre`. `valor` y `horas` llegan como
 * string Decimal (`"100000.000000"`, `"0.000"`) → se normalizan a número al
 * usarlos. Los campos `horas`, `permanente` y `programacion` los gestiona el
 * backend / otra pantalla y no se editan desde el formulario.
 */
export interface Adicional {
  readonly id: number;
  readonly valor: string | number | null;
  readonly horas: string | number | null;
  readonly aplica_dia_laborado: boolean;
  readonly inactivo: boolean;
  readonly permanente: boolean;
  readonly detalle: string | null;
  // Foreign keys (id pelado) + companion `*_nombre`
  readonly contrato: number | null;
  readonly contrato_nombre: string | null;
  /**
   * Datos del empleado que firma el contrato, con el prefijo del camino que
   * recorre el backend (`contrato` → `contacto`): su id interno y su cédula.
   * Alimentan los addons del autocomplete al editar y las columnas del listado.
   */
  readonly contrato_contacto_id: number | null;
  readonly contrato_contacto_numero_identificacion: string | null;
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
