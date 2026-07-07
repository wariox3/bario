/**
 * Modelos de lectura y escritura de los **documentos de servicio** (vigilancia):
 * contrato servicio, pedido servicio y futuros documentos de la misma familia.
 *
 * Todos viven sobre el endpoint genérico `/api/general/documento` discriminado
 * por `documento_tipo`. Las interfaces **extienden** el contrato base común a
 * cualquier documento (`Documento*Base` en `@reddoc/core`), agregando solo los
 * campos propios de vigilancia (sector, estrato, salario, horas, modalidad,
 * puesto, días, etc.). El read-model refleja, best-effort, lo que devuelve
 * `GET /api/general/documento/:id/`; sus nombres de campo pueden requerir ajuste
 * al contrastar contra la API real.
 */
import type {
  DocumentoDetallePayloadBase,
  DocumentoDetalleReadBase,
  DocumentoListRowBase,
  DocumentoPayloadBase,
  DocumentoReadBase,
} from '@reddoc/core';

export type { DocumentoDetalleImpuestoRead } from '@reddoc/core';

/** Shape (parcial) de un documento de servicio leído desde la API en edición. */
export interface ServicioDocumentoRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  readonly sector: number | null;
  /** Nombre del sector para etiquetar el selector al cargar en edición. */
  readonly sector_nombre?: string | null;
  readonly estrato: number | null;
  /** El backend lo devuelve como string con cola de ceros (`"1423500.000000"`). */
  readonly salario: string | number | null;
}

/**
 * Fila del listado `general/documento/lista/` de un documento de servicio.
 *
 * Es plana y distinta del read de edición (`ServicioDocumentoRead`): no trae
 * `detalles` y sí los acumulados que calcula el backend (`horas`, montos). Hereda
 * de `DocumentoListRowBase` las columnas comunes a la tabla y agrega las de
 * vigilancia (sector, estrato, salario, horas). Los montos y horas viajan como
 * string con cola de decimales (`"48.00"`, `"18817299.435000"`); el formateo de
 * columnas los normaliza al renderizar.
 *
 * El framework de listas accede a los campos por `row[field]` (tipados como
 * `unknown`), así que esta interface documenta el contrato del endpoint; no es
 * un genérico que el framework instancie.
 */
export interface ServicioDocumentoListRow extends DocumentoListRowBase {
  readonly sector: number | null;
  readonly sector_nombre: string | null;
  readonly estrato: number | null;
  readonly salario: string | null;
  /** Horas totales de cobertura del documento (e.g. `"720.00"`). */
  readonly horas: string | null;
  readonly horas_diurnas: string | null;
  readonly horas_nocturnas: string | null;
}

/**
 * Shape (best-effort) de una línea de detalle leída desde la API en edición.
 * Los nombres `*_nombre` etiquetan los selectores al cargar; pueden requerir
 * ajuste al contrastar contra `GET /api/general/documento/:id/`.
 */
export interface ServicioDocumentoDetalleRead extends DocumentoDetalleReadBase {
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  /** Hora en formato `HH:mm:ss` (se ignoran los segundos). */
  readonly hora_desde: string | null;
  readonly hora_hasta: string | null;
  readonly modalidad: number | null;
  readonly modalidad_nombre?: string | null;
  readonly puesto: number | null;
  readonly puesto_nombre?: string | null;
  readonly salario?: string | number | null;
  readonly programar: boolean | null;
  /** Los días viajan como flags individuales (no como array). */
  readonly lunes?: boolean | null;
  readonly martes?: boolean | null;
  readonly miercoles?: boolean | null;
  readonly jueves?: boolean | null;
  readonly viernes?: boolean | null;
  readonly sabado?: boolean | null;
  readonly domingo?: boolean | null;
  readonly festivo?: boolean | null;
  readonly cortesia?: boolean | null;
  /**
   * Línea compuesta: su horario/días/modalidad se derivan de sus componentes,
   * no de esta línea. El backend lo resuelve; el front solo lo muestra.
   */
  readonly compuesto?: boolean | null;
  /**
   * Horas de cobertura de la línea, calculadas por el backend (string con cola
   * de ceros: `"48.00"`). `horas = horas_diurnas + horas_nocturnas`.
   */
  readonly horas?: string | null;
  readonly horas_diurnas?: string | null;
  readonly horas_nocturnas?: string | null;
  /** Precio mínimo regulado de la cobertura (string con cola de ceros). */
  readonly precio_minimo?: string | null;
  /** Referencia a la línea afectada en otro documento (trazabilidad). */
  readonly documento_detalle_afectado?: number | null;
  // `impuestos?` se hereda de `DocumentoDetalleReadBase`.
}

/** Cuerpo de una línea de detalle enviada en `POST`/`PATCH`. */
export interface ServicioDocumentoDetallePayload extends DocumentoDetallePayloadBase {
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly hora_desde: string | null;
  readonly hora_hasta: string | null;
  readonly modalidad: number | null;
  readonly puesto: number | null;
  readonly salario: number | null;
  readonly programar: boolean;
  /** Días como flags individuales (igual que el payload de supervigilancia). */
  readonly lunes: boolean;
  readonly martes: boolean;
  readonly miercoles: boolean;
  readonly jueves: boolean;
  readonly viernes: boolean;
  readonly sabado: boolean;
  readonly domingo: boolean;
  readonly festivo: boolean;
  readonly cortesia: boolean;
  /** Se reenvía tal cual para no perderlo en el round-trip (no hay UI que lo edite). */
  readonly compuesto: boolean;
  /** Referencia a la línea afectada en otro documento (trazabilidad). */
  readonly documento_detalle_afectado: number | null;
  /**
   * Horas y precio mínimo de la cobertura (del tarifador). Strings con 2 decimales,
   * igual que `precio`. Se persisten porque el backend no los recalcula al guardar.
   */
  readonly horas: string;
  readonly horas_diurnas: string;
  readonly horas_nocturnas: string;
  readonly precio_minimo: string;
  // `item`, `cantidad`, `precio` e `impuestos_ids` se heredan de `DocumentoDetallePayloadBase`.
}

/**
 * Cuerpo de `calcular-precio-supervigilancia`: la cobertura de una línea
 * (horario, modalidad, sector y días activos) que el backend usa para tarifar.
 * Los días viajan como flags individuales (no como array).
 */
export interface CalcularPrecioSupervigilanciaPayload {
  readonly hora_desde: string;
  readonly hora_hasta: string;
  readonly modalidad_id: number;
  readonly sector_id: number;
  readonly lunes: boolean;
  readonly martes: boolean;
  readonly miercoles: boolean;
  readonly jueves: boolean;
  readonly viernes: boolean;
  readonly sabado: boolean;
  readonly domingo: boolean;
  readonly festivo: boolean;
  readonly salario: number;
}

/**
 * Respuesta de `calcular-precio-supervigilancia`: el desglose de tarificación
 * de la cobertura. El precio mínimo reconcilia con el resto:
 * `horas_X = horas_X_unidad × total_dias` y
 * `precio_minimo ≈ Σ (horas_X × valor_hora_X)`.
 */
export interface CalcularPrecioSupervigilanciaResult {
  /** Horas diurnas por día (unidad). */
  readonly horas_diurnas_unidad: number;
  /** Horas nocturnas por día (unidad). */
  readonly horas_nocturnas_unidad: number;
  /** Días de cobertura del periodo. */
  readonly total_dias: number;
  /** Horas diurnas totales del periodo. */
  readonly horas_diurnas: number;
  /** Horas nocturnas totales del periodo. */
  readonly horas_nocturnas: number;
  /** Valor de la hora diurna. */
  readonly valor_hora_diurna: number;
  /** Valor de la hora nocturna (con recargo). */
  readonly valor_hora_nocturna: number;
  /** Precio mínimo regulado de la cobertura. */
  readonly precio_minimo: number;
}

/** Cuerpo enviado en `POST`/`PATCH` de un documento de servicio. */
export interface ServicioDocumentoPayload extends DocumentoPayloadBase {
  readonly sector: number | null;
  readonly estrato: number | null;
  readonly salario: number | null;
  /** Opcional: en edición se omite (los detalles transaccionan contra documento-detalle). */
  readonly detalles?: readonly ServicioDocumentoDetallePayload[];
}
