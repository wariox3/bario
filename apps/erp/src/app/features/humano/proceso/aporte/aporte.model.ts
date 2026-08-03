/**
 * Contratos de datos del **aporte a seguridad social** (la planilla PILA de un
 * periodo).
 *
 * Es un proceso, no un documento: vive en su propio endpoint `/humano/aporte/` y
 * su entregable no es una pantalla sino el **plano del operador**, el archivo que
 * se sube al operador de PILA.
 *
 * La jerarquía son tres niveles, y cada uno es una pestaña del workspace:
 *
 * - `Aporte` — la cabecera: alcance, entidades y los acumulados de cotización.
 * - `AporteContrato` — **quién entra**: un renglón por contrato con su tramo.
 * - `AporteDetalle` — **lo liquidado**: novedades, días, bases, tarifas y
 *   cotizaciones por subsistema. Lo fabrica el backend al generar.
 * - `AporteEntidad` — **a quién se le paga**: cotización por entidad.
 *
 * ⚠️ Contratos **supuestos** a partir del ERP legacy (nombres y tipos), sin
 * verificar contra el backend.
 */

/**
 * Forma de presentación de la planilla.
 *
 * Cambia cómo se agrupa el aporte frente al operador; el legacy solo ofrece los
 * dos valores y no documenta el efecto en el cálculo.
 *
 * TODO(backend): confirmar qué cambia exactamente en la liquidación.
 */
export const PRESENTACION = {
  /** Una planilla por sucursal. */
  SUCURSAL: 'S',
  /** Una planilla única para toda la empresa. */
  UNICA: 'U',
} as const;

export type Presentacion = (typeof PRESENTACION)[keyof typeof PRESENTACION];

/**
 * Los diez acumulados de cotización de la cabecera, más su total.
 *
 * Se tipan aparte porque son también la forma del resumen del workspace: la
 * pantalla los recorre como datos (ver `aporte.constants.ts`) en vez de repetir
 * once bloques de plantilla como el legacy.
 *
 * Todos llegan como número o como string decimal según el serializador, igual
 * que el resto de importes del ERP.
 */
export interface AporteCotizaciones {
  readonly cotizacion_pension: string | number | null;
  readonly cotizacion_solidaridad_solidaridad: string | number | null;
  readonly cotizacion_solidaridad_subsistencia: string | number | null;
  readonly cotizacion_voluntario_pension_afiliado: string | number | null;
  readonly cotizacion_voluntario_pension_aportante: string | number | null;
  readonly cotizacion_salud: string | number | null;
  readonly cotizacion_riesgos: string | number | null;
  readonly cotizacion_caja: string | number | null;
  readonly cotizacion_sena: string | number | null;
  readonly cotizacion_icbf: string | number | null;
  readonly cotizacion_total: string | number | null;
}

/** Read-model del aporte (listado, resumen y formulario en edición). */
export interface Aporte extends AporteCotizaciones {
  readonly id: number;

  /** Periodo liquidado. Lo calcula el backend a partir de `anio` y `mes`. */
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly fecha_hasta_periodo: string | null;
  readonly anio: number | null;
  readonly mes: number | null;
  /**
   * Periodo de **salud**, que en PILA puede diferir del de pensión.
   *
   * ⚠️ El legacy lo lee y no lo muestra en ninguna pantalla. Se conserva en el
   * modelo para no perderlo; ver el pendiente en `humano/PENDIENTES.md`.
   */
  readonly anio_salud: number | null;
  readonly mes_salud: number | null;

  readonly presentacion: Presentacion | null;
  readonly sucursal_id: number | null;
  readonly sucursal_nombre?: string | null;

  /** Entidades que no salen del contrato sino de la cabecera del aporte. */
  readonly entidad_riesgo_id: number | null;
  readonly entidad_riesgo_nombre?: string | null;
  readonly entidad_sena_id: number | null;
  readonly entidad_sena_nombre?: string | null;
  readonly entidad_icbf_id: number | null;
  readonly entidad_icbf_nombre?: string | null;

  /** Contadores que calcula el backend: contratos incluidos, empleados distintos y líneas liquidadas. */
  readonly contratos: number | null;
  readonly empleados: number | null;
  readonly lineas: number | null;
  readonly base_cotizacion: string | number | null;

  readonly estado_generado: boolean;
  readonly estado_aprobado: boolean;
}

/** Payload de creación y edición de la cabecera. */
export interface AportePayload {
  readonly sucursal: number | null;
  readonly anio: number | null;
  readonly mes: number | null;
  readonly presentacion: Presentacion;
  readonly entidad_riesgo: number | null;
  readonly entidad_sena: number | null;
  readonly entidad_icbf: number | null;
}

/**
 * Un contrato incluido en el aporte: el tramo del periodo que le corresponde.
 *
 * `ingreso`, `retiro` y `error_terminacion` no son decoración — pintan la fila
 * en la pestaña de contratos y son la única validación visual del proceso.
 */
export interface AporteContrato {
  readonly id: number;
  readonly contrato: number | null;
  readonly contrato__contacto_id: number | null;
  readonly contrato__contacto__numero_identificacion: string | null;
  readonly contrato__contacto__nombre_corto: string | null;

  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly dias: number | null;
  readonly salario: string | number | null;
  readonly base_cotizacion: string | number | null;

  /** Entró en el periodo. */
  readonly ingreso: boolean;
  /** Salió en el periodo. */
  readonly retiro: boolean;
  /** El contrato termina de forma inconsistente con el periodo: hay que revisarlo. */
  readonly error_terminacion: boolean;
}

/**
 * La línea liquidada, con las novedades PILA y el desglose por subsistema.
 *
 * La fabrica el backend al generar y **no se edita**: el legacy dejó a medias un
 * formulario de ajuste (`actualizarDetalles`) que nunca se llamó desde ninguna
 * pantalla.
 *
 * El bloque de banderas son los códigos de novedad de PILA: ingreso, retiro,
 * variación permanente/transitoria de salario, suspensión, incapacidad general,
 * licencia de maternidad, vacaciones y licencia remunerada.
 */
export interface AporteDetalle {
  readonly id: number;
  readonly aporte_contrato: number | null;
  readonly aporte_contrato__contrato__contacto__numero_identificacion: string | null;
  readonly aporte_contrato__contrato__contacto__nombre_corto: string | null;

  readonly ingreso: boolean;
  readonly retiro: boolean;
  readonly variacion_permanente_salario: boolean;
  readonly variacion_transitoria_salario: boolean;
  readonly suspension_temporal_contrato: boolean;
  readonly incapacidad_general: boolean;
  readonly licencia_maternidad: boolean;
  readonly vacaciones: boolean;
  readonly licencia_remunerada: boolean;
  readonly salario_integral: boolean;
  readonly dias_incapacidad_laboral: number | null;

  readonly aporte_contrato_salario: string | number | null;
  readonly horas: number | null;

  readonly dias_pension: number | null;
  readonly dias_salud: number | null;
  readonly dias_riesgos: number | null;
  readonly dias_caja: number | null;

  readonly base_cotizacion_pension: string | number | null;
  readonly base_cotizacion_salud: string | number | null;
  readonly base_cotizacion_riesgos: string | number | null;
  readonly base_cotizacion_caja: string | number | null;

  readonly tarifa_pension: string | number | null;
  readonly tarifa_salud: string | number | null;
  readonly tarifa_riesgos: string | number | null;
  readonly tarifa_caja: string | number | null;
  readonly tarifa_sena: string | number | null;
  readonly tarifa_icbf: string | number | null;

  readonly cotizacion_pension: string | number | null;
  readonly cotizacion_solidaridad_solidaridad: string | number | null;
  readonly cotizacion_solidaridad_subsistencia: string | number | null;
  readonly cotizacion_voluntario_pension_afiliado: string | number | null;
  readonly cotizacion_voluntario_pension_aportante: string | number | null;
  readonly cotizacion_salud: string | number | null;
  readonly cotizacion_riesgos: string | number | null;
  readonly cotizacion_caja: string | number | null;
  readonly cotizacion_sena: string | number | null;
  readonly cotizacion_icbf: string | number | null;
  readonly cotizacion_total: string | number | null;
}

/** Lo que se le paga a una entidad (EPS, AFP, ARL, caja, SENA, ICBF). */
export interface AporteEntidad {
  readonly id: number;
  /** Subsistema al que pertenece la entidad; es la clave del agrupado. */
  readonly tipo: string | null;
  readonly entidad_id: number | null;
  readonly entidad__nombre: string | null;
  readonly cotizacion: string | number | null;
}

/** Respuesta de `cargar-contrato/`: cuántos contratos quedaron en el aporte. */
export interface CargarContratosResultado {
  readonly contratos?: number;
}
