/**
 * Programación: movimiento del módulo de turnos.
 *
 * Es una **vista recortada de los documentos de pedido servicio** (tipo 35) que
 * el backend sirve por el endpoint genérico `general/documento/lista/`. El
 * listado reusa el `ENTITY_DATA_GATEWAY` del framework de documentos (camino A)
 * desde el shell propio de este movimiento (camino B) — ver
 * `programacion.constants.ts` (`PROGRAMACION_DOCUMENT_CONFIG`).
 *
 * Por eso el shape mapea el read-model de `general/documento/lista/`: la
 * identificación del tercero llega como `tercero_numero_identificacion` y el
 * contacto como `contacto_nombre`. Solo se tipan los campos que la tabla muestra.
 */
export interface Programacion {
  readonly id: number;
  readonly numero: string;
  readonly fecha: string;
  readonly tercero_numero_identificacion: string;
  readonly contacto_nombre: string;
  readonly horas: number;
  readonly horas_diurnas: number;
  readonly horas_nocturnas: number;
  /** Horas ya programadas (con turno asignado), para el par `contratadas / programadas`. */
  readonly horas_programadas: number;
  readonly horas_diurnas_programadas: number;
  readonly horas_nocturnas_programadas: number;
}

/**
 * Horas contratadas y programadas (total / diurnas / nocturnas). Las comparten la
 * cabecera del documento y cada fila (puesto): `horas*` son las contratadas y
 * `horas*_programadas` las que ya tienen turno asignado en el período.
 */
export interface ProgramacionHoras {
  readonly horas: number;
  readonly horas_diurnas: number;
  readonly horas_nocturnas: number;
  readonly horas_programadas: number;
  readonly horas_diurnas_programadas: number;
  readonly horas_nocturnas_programadas: number;
}

/**
 * Cabecera del documento de programación (`documento` en el detalle): número, fecha,
 * contacto (tercero) y el resumen de horas del documento completo.
 */
export interface ProgramacionDocumentoCabecera extends ProgramacionHoras {
  readonly id: number;
  readonly numero: number;
  /** Fecha del documento en ISO `YYYY-MM-DD`. */
  readonly fecha: string;
  readonly contacto_nombre_corto: string | null;
  readonly contacto_numero_identificacion: string | null;
}

/**
 * Respuesta de `GET /turno/programacion/detalle/?documento=<id>`.
 *
 * Calendario por documento: `documento` es la cabecera (número/fecha/contacto/horas),
 * `fechas` las columnas (strings ISO `YYYY-MM-DD`) y `filas` las líneas agrupables
 * por `documento_detalle_id`.
 */
export interface ProgramacionDetalleResponse {
  readonly documento: ProgramacionDocumentoCabecera;
  readonly fechas: readonly string[];
  readonly filas: readonly ProgramacionFila[];
}

/**
 * Columna de día del calendario, normalizada en el front a partir del string ISO
 * que llega en `ProgramacionDetalleResponse.fechas`.
 *  - `clave`: la fecha ISO original (`'2026-06-01'`) — índice para `fila.dias`.
 *  - `etiqueta`: número de día visible en el header (`1`..`31`).
 */
export interface ProgramacionFecha {
  readonly clave: string;
  readonly etiqueta: string;
  /** Inicial del día de la semana en español (L M X J V S D). */
  readonly inicial: string;
  readonly finDeSemana: boolean;
}

/**
 * Celda de un día: el turno asignado (si hay) y sus horas. Las claves del mapa
 * `dias` son las fechas ISO de `fechas` (`'2026-06-01'`).
 */
export interface ProgramacionDiaCelda {
  readonly programacion_id: number;
  readonly turno_id: number | null;
  readonly turno_codigo: string | null;
  readonly turno_nombre: string | null;
  readonly horas: number;
  readonly horas_diurnas: number;
  readonly horas_nocturnas: number;
  readonly festivo: boolean;
}

/**
 * Fila del calendario: un **contrato** asignado a un puesto. Varias filas pueden
 * compartir `documento_detalle_id` (el grid las agrupa por puesto); el
 * `contrato_contacto_nombre_corto` identifica cada fila dentro del grupo.
 *
 * Hereda el resumen de horas de `ProgramacionHoras` (contratadas y programadas).
 */
export interface ProgramacionFila extends ProgramacionHoras {
  readonly documento_detalle_id: number;
  /** Detalle del documento afectado (origen del puesto); informativo. */
  readonly documento_detalle_afectado_id: number | null;
  readonly puesto_id: number | null;
  readonly puesto_nombre: string | null;
  /** Modalidad del puesto (ej. `SIN ARMA`). */
  readonly modalidad_nombre: string | null;
  /** Franja horaria del puesto en formato `HH:mm:ss`. */
  readonly hora_desde: string | null;
  readonly hora_hasta: string | null;
  readonly contrato_id: number | null;
  /** Contacto del contrato asignado (empleado). */
  readonly contrato_contacto_id: number | null;
  readonly contrato_contacto_nombre_corto: string | null;
  readonly contrato_contacto_numero_identificacion: string | null;
  /** Mapa fecha ISO → celda del día (clave = `ProgramacionFecha.clave`). */
  readonly dias: Record<string, ProgramacionDiaCelda | null>;
}

/**
 * Lectura **mínima** de la línea de documento (pedido servicio) que los modales
 * de programación necesitan: `fecha_desde`, de la que deriva el período (mes/año)
 * a programar, y `generado`, que indica si la programación ya se materializó (lo
 * usa el modal de prototipo para alternar el botón entre generar y desgenerar).
 * Se lee vía `DocumentoDetalleService.obtenerPorId` con este tipo por llamada —
 * así no se acopla al modelo completo de `venta/`.
 */
export interface ProgramacionLineaRead {
  /** Fecha de inicio de la línea (ISO `YYYY-MM-DD`); define el período. */
  readonly fecha_desde: string | null;
  /** `true` si la programación de la línea ya se generó (materializó). */
  readonly generado: boolean;
}

/** Ítem de día en `crear`. `fecha` en formato ISO `YYYY-MM-DD`. */
export interface ProgramacionItem {
  readonly fecha: string;
  /** Código del turno escrito en la celda (`null` si el día queda sin turno). */
  readonly turno_codigo: string | null;
}

/**
 * Payload de `POST /turno/programacion/crear/`: crea la
 * programación de un contrato en un puesto (`documento_detalle_id`) con un ítem
 * por día (`fecha` + `turno_codigo`).
 */
export interface CrearProgramacionPayload {
  readonly contrato_id: number;
  readonly documento_detalle_id: number;
  readonly items: readonly ProgramacionItem[];
}

/**
 * Payload de `POST /turno/programacion/actualizar/`: reprograma los
 * turnos de un contrato ya asignado a un puesto. Mismo shape que la creación
 * (contrato + `documento_detalle_id` + un ítem por día); el backend sobrescribe
 * los días existentes en vez de responder con conflicto.
 */
export type ActualizarProgramacionPayload = CrearProgramacionPayload;

/**
 * Payload de `POST /turno/programacion/actualizar-masivo/`: reprograma
 * varias líneas (contrato en un puesto) en una sola llamada. Cada entrada es un
 * `ActualizarProgramacionPayload` completo; el backend los aplica en batch.
 *
 * TODO: tipar el 400 del masivo cuando el backend confirme el shape (idealmente
 * agrupado por `documento_detalle_id` para conservar el resaltado por celda).
 */
export interface ActualizarProgramacionMasivoPayload {
  readonly programaciones: readonly ActualizarProgramacionPayload[];
}

/**
 * Payload de `POST /turno/programacion/eliminar/`: borra la
 * programación (mes de turnos) de un contrato en un puesto (`documento_detalle_id`).
 */
export interface EliminarProgramacionPayload {
  readonly contrato_id: number;
  readonly documento_detalle_id: number;
}

/**
 * Payload de `POST /turno/programacion/eliminar-masivo/`: borra varias
 * líneas (contrato en un puesto) en una sola llamada. Espejo del borrado single.
 */
export interface EliminarProgramacionMasivoPayload {
  readonly programaciones: readonly EliminarProgramacionPayload[];
}

/** Respuesta (200) del borrado masivo: cuántas celdas-día se eliminaron en total. */
export interface ProgramacionEliminacionResumen {
  readonly eliminados: number;
}

/**
 * Resumen que devuelven las mutaciones de programación **por línea**
 * (crear/actualizar/eliminar): cuántas celdas-día se crearon, actualizaron y
 * eliminaron. Ej. `{ creados: 0, actualizados: 0, eliminados: 1 }` al borrar un día.
 */
export interface ProgramacionMutacionResumen {
  readonly creados: number;
  readonly actualizados: number;
  readonly eliminados: number;
}

/**
 * Resumen de una línea dentro de la respuesta masiva, anclado por `indice` (posición
 * de la programación en el array `programaciones` enviado).
 */
export interface ProgramacionMutacionResultado extends ProgramacionMutacionResumen {
  readonly indice: number;
}

/**
 * Respuesta de `POST /turno/programacion/actualizar-masivo/`: un
 * `resultados[]` con el resumen de cada línea enviada (en el orden del payload).
 */
export interface ProgramacionMutacionMasivoResumen {
  readonly resultados: readonly ProgramacionMutacionResultado[];
}

/**
 * Error devuelto por crear/actualizar. `codigo` es el motivo máquina
 * (`turno_inexistente`, `dia_ocupado`, `horas_diurnas_excedidas`, …) para ramificar
 * sin parsear texto; `mensaje` es el detalle legible.
 *
 * `fecha` distingue el **alcance**: con fecha ISO es un error de **celda (día)**
 * anclado a ese ítem; con `null` es un error de **puesto/línea** (ej. horas
 * excedidas), que no se ancla a ninguna casilla.
 */
export interface ProgramacionErrorItem {
  /** Día en error (ISO `YYYY-MM-DD`), o `null` si el error es de puesto/línea. */
  readonly fecha: string | null;
  /** Código de turno que causó el error (el que escribió el usuario), o `null`. */
  readonly turno_codigo: string | null;
  /** Motivo máquina del error (ej. `turno_inexistente`, `dia_ocupado`). */
  readonly codigo: string;
  /** Mensaje legible por celda. */
  readonly mensaje: string;
}

/**
 * Body del 400 de crear/actualizar: `detail` (resumen para el toast)
 * + `errores` (una entrada por celda en conflicto, anclada por `fecha`).
 */
export interface ProgramacionErroresResponse {
  readonly detail: string;
  readonly errores: readonly ProgramacionErrorItem[];
}

/**
 * Errores de una **línea** dentro del 400 masivo, anclados por `indice` (posición de
 * la programación en el array `programaciones` enviado).
 */
export interface ProgramacionErrorLinea {
  readonly indice: number;
  readonly errores: readonly ProgramacionErrorItem[];
}

/**
 * Body del 400 de `actualizar-masivo`: `detail` (resumen para el toast)
 * + `resultados` (errores por línea, anclados por `indice`).
 */
export interface ProgramacionErroresMasivoResponse {
  readonly detail: string;
  readonly resultados: readonly ProgramacionErrorLinea[];
}
