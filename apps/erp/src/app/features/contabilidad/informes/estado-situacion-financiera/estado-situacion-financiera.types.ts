/**
 * Contrato de `/contabilidad/movimiento-informe-situacion/`: el estado de
 * situación financiera en sus dos presentaciones, que se eligen con `informe`
 * en el body. `lista/` no pagina en ninguna de las dos.
 *
 * - `base`: una fila por cuenta que movió en el rango, sin estructura. Pide
 *   `fecha_desde` y `fecha_hasta`.
 * - `formal`: el estado presentado. Saldos acumulados a la fecha de corte
 *   (`fecha_hasta`), en secciones de activo, pasivo y patrimonio con su parte
 *   corriente y no corriente, y un corte anterior para comparar. Es la única que
 *   sirve `pdf/` (la base responde 400).
 */
export type PresentacionSituacion = 'base' | 'formal';

/**
 * Contra qué corte se compara el formal:
 * - `cierre_anterior` (default del backend): 31 de diciembre del año anterior.
 * - `anio_anterior`: la misma fecha un año antes.
 * - `ninguno`: sin comparativo; `anterior`, `variacion` y `porcentaje` llegan nulos.
 */
export type CompararSituacion = 'cierre_anterior' | 'anio_anterior' | 'ninguno';

/** Detalle de las líneas del formal: cuenta (4 dígitos) o grupo (2). */
export type NivelSituacion = 'cuenta' | 'grupo';

/**
 * Cómo se pinta cada fila del formal:
 *
 * - `SECCION`: ACTIVO, PASIVO, PATRIMONIO. Sin importes.
 * - `SUBSECCION`: corriente / no corriente. Sin importes.
 * - `LINEA`: una cuenta o un grupo, según `nivel`.
 * - `RESULTADO`: el resultado del ejercicio dentro del patrimonio (clases 4 a 7
 *   más el grupo 36, acumulados al corte).
 * - `SUBTOTAL`: total corriente / no corriente.
 * - `TOTAL`: total activo / pasivo / patrimonio (doble subrayado).
 * - `TOTAL_FINAL`: total pasivo y patrimonio (doble subrayado).
 */
export type SituacionFormalFilaTipo =
  | 'SECCION'
  | 'SUBSECCION'
  | 'LINEA'
  | 'RESULTADO'
  | 'SUBTOTAL'
  | 'TOTAL'
  | 'TOTAL_FINAL';

/**
 * Una fila del formal. Cada sección viene en positivo en su naturaleza; una
 * cuenta correctora (la depreciación acumulada) sale negativa.
 */
export interface SituacionFormalFila {
  readonly tipo: SituacionFormalFilaTipo;
  readonly codigo: string;
  readonly nombre: string;
  /** Nulo en `SECCION` y `SUBSECCION`, que son solo el título. */
  readonly actual: string | null;
  /** Nulos sin comparativo. */
  readonly anterior: string | null;
  readonly variacion: string | null;
  /** Fracción (0.25 = 25 %) sobre el valor absoluto del corte anterior; nula si está en cero. */
  readonly porcentaje: string | null;
}

/**
 * Resumen de un corte. `cuadrado` es activo = pasivo + patrimonio y `diferencia`
 * lo que falta (activo − pasivo − patrimonio): lo descuadra un documento que no
 * cuadra o un filtro. Las dos razones son nulas si su divisor es cero;
 * `endeudamiento` es una fracción.
 */
export interface SituacionFormalCorte {
  readonly activo: string;
  readonly activo_corriente: string;
  readonly activo_no_corriente: string;
  readonly pasivo: string;
  readonly pasivo_corriente: string;
  readonly pasivo_no_corriente: string;
  readonly patrimonio: string;
  readonly pasivo_patrimonio: string;
  readonly cuadrado: boolean;
  readonly diferencia: string;
  readonly capital_trabajo: string;
  readonly razon_corriente: string | null;
  readonly endeudamiento: string | null;
}

/** Lo que va encima del estado: la empresa, los dos cortes y su resumen. */
export interface SituacionFormalEncabezado {
  readonly empresa: string;
  readonly nit: string;
  /** `yyyy-MM-dd`. */
  readonly fecha_corte: string;
  /** `yyyy-MM-dd`; nula sin comparativo. */
  readonly fecha_anterior: string | null;
  readonly comparar: CompararSituacion;
  readonly nivel: NivelSituacion;
  readonly actual: SituacionFormalCorte;
  /** Nulo sin comparativo. */
  readonly anterior: SituacionFormalCorte | null;
}

/** Respuesta de `lista/` con `informe=formal`. */
export interface SituacionFormal {
  readonly encabezado: SituacionFormalEncabezado;
  readonly filas: readonly SituacionFormalFila[];
}

/** Lo que solo lee el formal: contra qué se compara y con cuánto detalle. */
export interface SituacionFormalOpciones {
  readonly comparar: CompararSituacion;
  readonly nivel: NivelSituacion;
}
