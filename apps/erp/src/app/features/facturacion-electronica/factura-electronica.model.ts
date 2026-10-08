/**
 * Emisor de la empresa en RedEDoc, tal como lo devuelve
 * `GET /general/electronico/emisor-consultar/`.
 *
 * Los ids de ubicación y de catálogos (`tipo_identificacion`, `pais`,
 * `municipio`…) llegan sin nombre.
 */
export interface EmisorRedEDoc {
  readonly id: number;
  readonly usuario: number;
  readonly cuenta: number;
  readonly razon_social: string;
  readonly tipo_identificacion: number;
  readonly numero_identificacion: string;
  readonly digito_verificacion: string;
  readonly tipo_organizacion: number;
  readonly responsabilidades: readonly number[];
  readonly pais: number;
  readonly departamento: number;
  readonly municipio: number;
  readonly direccion: string;
  readonly codigo_postal: string;
  readonly correo_copia: string;
  readonly telefono: string;
  readonly correo: string;
  readonly activo: boolean;
  readonly referencia_externa: string;
  readonly habilitado_facturacion: boolean;
  readonly habilitado_nomina: boolean;
  readonly habilitado_documento_equivalente: boolean;
  readonly ambiente_facturacion: number;
  readonly ambiente_nomina: number;
  readonly ambiente_documento_equivalente: number;
  readonly certificado_activo: boolean;
  readonly certificado_vence: string | null;
  readonly resoluciones: readonly unknown[];
}

/** Resultado de consultar el emisor: el backend contesta 404 si no existe. */
export type EmisorConsulta =
  | { readonly registrado: false }
  | { readonly registrado: true; readonly emisor: EmisorRedEDoc };

/**
 * Certificado digital del emisor en RedEDoc, una fila de
 * `GET /general/electronico/certificado-consultar/` (lista paginada DRF).
 * Las fechas llegan como `AAAA-MM-DD`.
 */
export interface CertificadoRedEDoc {
  readonly id: number;
  readonly emisor: number;
  readonly alias: string;
  readonly nombre_archivo: string;
  readonly vigente_desde: string;
  readonly vigente_hasta: string;
}

export interface CertificadoConsultaResponse {
  readonly count: number;
  readonly results: readonly CertificadoRedEDoc[];
}

/** Módulo de RedEDoc por el que se consulta el software (`?modulo=`). */
export type SoftwareModulo = 'facturacion' | 'nomina';

/** Tipo de documento que habilita un software; cada módulo agrupa los suyos. */
export type SoftwareTipo = 'facturacion' | 'documento_equivalente' | 'nomina';

/**
 * Software del emisor ante la DIAN, una fila de
 * `GET /general/electronico/software-consultar/?modulo=` (lista paginada DRF,
 * a lo sumo una fila por tipo). El `pin` se envía al crear y nunca vuelve.
 */
export interface SoftwareRedEDoc {
  readonly id: number;
  readonly emisor: number;
  readonly tipo: SoftwareTipo;
  readonly modulo: SoftwareModulo;
  readonly identificador: string;
  readonly test_set_id: string;
  readonly set_pruebas_aceptado: boolean;
}

export interface SoftwareConsultaResponse {
  readonly count: number;
  readonly results: readonly SoftwareRedEDoc[];
}

/** Body de `POST /general/electronico/software-crear/`. */
export interface SoftwareCrearPayload {
  readonly tipo: SoftwareTipo;
  readonly identificador: string;
  readonly pin: string;
  readonly test_set_id: string;
}

/**
 * Body de `PATCH /general/electronico/software-actualizar/`: el `id` dice cuál;
 * lo que no viaja se conserva.
 */
export interface SoftwareActualizarPayload {
  readonly id: number;
  readonly identificador?: string;
  readonly pin?: string;
  readonly test_set_id?: string;
}
