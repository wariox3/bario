/**
 * Contratos de datos de la **programación de nómina**.
 *
 * Una programación no es un documento: es el **proceso** que liquida un periodo
 * para un grupo de empleados y que, al generarse, fabrica los documentos de
 * nómina (tipo 14). Vive en su propio endpoint `humano/programacion/`.
 *
 * ⚠️ Contratos **supuestos** a partir del ERP legacy (nombres y tipos), sin
 * verificar contra el backend.
 */

/**
 * Tipos de pago del catálogo `humano/pago_tipo`.
 *
 * No es decoración: **el tipo de pago cambia el comportamiento de toda la
 * pantalla** — qué columnas tiene la tabla de renglones, qué campos se editan en
 * un renglón y qué validación aplica al rango de fechas.
 *
 * Los ids salen de los `switch` y comparaciones del legacy
 * (`pago_tipo_id == 2 || == 3 || == 4`), no de una respuesta del catálogo.
 */
export const PAGO_TIPO_ID = {
  /** Nómina del periodo: la liquidación con horas, recargos y deducciones. */
  NOMINA: 1,
  PRIMA: 2,
  CESANTIA: 3,
  INTERES_CESANTIA: 4,
} as const;

export type PagoTipoId = (typeof PAGO_TIPO_ID)[keyof typeof PAGO_TIPO_ID];

/**
 * Las 17 banderas que deciden **qué se liquida** en la programación. Viven en la
 * cabecera y el backend las respeta al generar.
 *
 * Se tipan aparte del read-model porque son también la forma del formulario y la
 * clave de la metadata que las renderiza (ver `programacion.banderas.ts`): así
 * agregar una bandera es tocar el tipo y la metadata, y el resto compila solo.
 */
export interface ProgramacionBanderas {
  readonly pago_horas: boolean;
  readonly pago_auxilio_transporte: boolean;
  readonly pago_incapacidad: boolean;
  readonly pago_licencia: boolean;
  readonly pago_vacacion: boolean;
  readonly pago_prima: boolean;
  readonly pago_cesantia: boolean;
  readonly pago_interes: boolean;
  readonly descuento_salud: boolean;
  readonly descuento_pension: boolean;
  readonly descuento_fondo_solidaridad: boolean;
  readonly descuento_retencion_fuente: boolean;
  readonly descuento_credito: boolean;
  readonly descuento_embargo: boolean;
  readonly adicional: boolean;
  readonly base_prestacion_minimo: boolean;
  readonly base_prestacion_minimo_salario: boolean;
}

/** Read-model de la programación (listado, ficha y formulario en edición). */
export interface Programacion extends ProgramacionBanderas {
  readonly id: number;
  readonly nombre: string | null;
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  /** Cierre del periodo; puede ir más allá de `fecha_hasta`. */
  readonly fecha_hasta_periodo: string | null;
  readonly comentario: string | null;

  readonly pago_tipo_id: number | null;
  readonly pago_tipo_nombre?: string | null;
  readonly grupo_id: number | null;
  readonly grupo_nombre?: string | null;
  readonly periodo_id: number | null;
  readonly periodo_nombre?: string | null;

  /** Acumulados que calcula el backend al generar. */
  readonly dias: number | null;
  readonly contratos: number | null;
  readonly devengado: string | number | null;
  readonly deduccion: string | number | null;
  readonly total: string | number | null;

  /** Las dos banderas que gobiernan el ciclo de vida — ver `programacion.estado.ts`. */
  readonly estado_generado: boolean;
  readonly estado_aprobado: boolean;
}

/** Body (POST/PUT) de la cabecera. */
export interface ProgramacionPayload extends ProgramacionBanderas {
  readonly nombre: string | null;
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly fecha_hasta_periodo: string | null;
  readonly comentario: string | null;
  readonly pago_tipo: number | null;
  readonly grupo: number | null;
  readonly periodo: number | null;
}

/**
 * Renglón de la programación: un contrato con su liquidación del periodo.
 *
 * Las líneas las genera el backend con `cargar-contrato/`; desde el front solo se
 * ajustan (horas, días de transporte, banderas por empleado) y se eliminan.
 *
 * Los campos de horas solo aplican al tipo NOMINA; `salario_promedio` y
 * `base_prestacion` a prima y cesantías. Todos viven siempre en el read porque el
 * backend sirve el mismo serializador — la UI decide qué mostrar.
 */
export interface ProgramacionDetalle {
  readonly id: number;
  readonly programacion_id: number;

  // Identificación del empleado
  readonly contrato_id: number;
  readonly contrato_contacto_id: number | null;
  readonly contrato_contacto_numero_identificacion: string | null;
  readonly contrato_contacto_nombre_corto: string | null;

  // Periodo liquidado del contrato
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly dias: number | null;
  readonly dias_transporte: number | null;

  // Bases
  readonly salario: string | number | null;
  readonly salario_promedio: string | number | null;
  readonly base_prestacion: string | number | null;

  // Horas y recargos (solo tipo NOMINA)
  readonly diurna: number | null;
  readonly nocturna: number | null;
  readonly festiva_diurna: number | null;
  readonly festiva_nocturna: number | null;
  readonly extra_diurna: number | null;
  readonly extra_nocturna: number | null;
  readonly extra_festiva_diurna: number | null;
  readonly extra_festiva_nocturna: number | null;
  readonly recargo_nocturno: number | null;
  readonly recargo_festivo_diurno: number | null;
  readonly recargo_festivo_nocturno: number | null;

  // Resultado
  readonly devengado: string | number | null;
  readonly deduccion: string | number | null;
  readonly total: string | number | null;

  /**
   * Marcas que el legacy usa para resaltar la fila: `ingreso`/`retiro` pintan la
   * fecha en verde (el contrato empezó o terminó dentro del periodo) y
   * `error_terminacion` en rojo (inconsistencia en la terminación).
   */
  readonly ingreso: boolean;
  readonly retiro: boolean;
  readonly error_terminacion: boolean;

  /** Banderas por empleado: sobreescriben las de la cabecera para este contrato. */
  readonly pago_horas: boolean;
  readonly pago_auxilio_transporte: boolean;
  readonly pago_incapacidad: boolean;
  readonly pago_licencia: boolean;
  readonly pago_vacacion: boolean;
  readonly descuento_salud: boolean;
  readonly descuento_pension: boolean;
  readonly descuento_fondo_solidaridad: boolean;
  readonly descuento_retencion_fuente: boolean;
  readonly descuento_credito: boolean;
  readonly descuento_embargo: boolean;
  readonly adicional: boolean;
}

/**
 * Payload de un **concepto adicional creado desde la programación**.
 *
 * Extiende el del master (`AdicionalPayload`) con los dos campos que el master
 * declara pero no expone en su formulario porque los gestiona este proceso: la
 * programación a la que pertenece y las horas.
 *
 * Se declara acá y no en el master para no ensanchar su contrato con algo que solo
 * usa la programación. Al extenderlo sigue siendo aceptado por
 * `AdicionalService.create/update`.
 */
export interface AdicionalProgramacionPayload {
  readonly contrato: number | null;
  readonly concepto: number | null;
  readonly valor: number | null;
  readonly detalle: string | null;
  readonly aplica_dia_laborado: boolean;
  readonly inactivo: boolean;
  readonly programacion: number;
  readonly horas: number;
}

/** Respuesta de `cargar-contrato/`: cuántos contratos quedaron cargados. */
export interface CargarContratosResultado {
  readonly contratos: number;
}

/** Respuesta de `generar/`: los acumulados de la liquidación. */
export interface GenerarResultado {
  readonly total: number;
  readonly devengado: number;
  readonly deduccion: number;
}
