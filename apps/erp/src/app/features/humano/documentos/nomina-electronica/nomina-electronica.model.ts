import type { DocumentoReadBase } from '@reddoc/core';

/**
 * Cabecera de una **nómina electrónica** (`documento_tipo_id = 15`) leída desde
 * `GET /general/documento/:id/`.
 *
 * No es "la nómina otra vez": es un documento que **agrega**. Apunta hacia atrás
 * a las nóminas del periodo de un empleado (ver `NominaElectronicaOrigen`), así
 * que un mes pagado por quincenas son dos nóminas y una sola nómina electrónica.
 * Sus totales son los del periodo completo.
 *
 * Cuando la DIAN la acepta, el backend escribe el `cue` — el CUNE con el que se
 * consulta en el portal público.
 *
 * La `fecha` (una sola, no el rango `desde`/`hasta` de la nómina) la aporta
 * `DocumentoReadBase`, y las banderas de estado —incluida
 * `estado_electronico_enviado`— vienen de `DocumentoEstados`.
 *
 * **Supuestos pendientes de confirmar con backend**, tomados del ERP legacy:
 * los `contacto_*` aplanados, las dos bases y `estado_electronico_enviado`. El
 * legacy además pedía `serializador=detalle_nomina` en esta lectura; acá se
 * omite, igual que en la nómina (14). Ver `PENDIENTES §7`.
 */
export interface NominaElectronicaRead extends DocumentoReadBase {
  /** Consecutivo del documento. */
  readonly numero?: string | null;
  /** Empleado: identificación y nombre corto, aplanados desde el contacto. */
  readonly contacto_numero_identificacion?: string | null;
  readonly contacto_nombre_corto?: string | null;
  /** Ingreso base de cotización (IBC) del periodo. */
  readonly base_cotizacion?: string | number | null;
  /** Ingreso base de prestaciones (IBP) del periodo. */
  readonly base_prestacion?: string | number | null;
  /** Suma de los conceptos que suman. */
  readonly devengado?: string | number | null;
  /** Suma de los conceptos que restan. */
  readonly deduccion?: string | number | null;
  /** Neto: devengado − deducción. */
  readonly total?: string | number | null;
  /** CUNE que devuelve la DIAN al aceptar el documento. */
  readonly cue?: string | null;
}

/**
 * Una de las **nóminas origen** que componen la nómina electrónica.
 *
 * Se leen de `POST /general/documento/lista/` filtrando por `documento_referencia_id`: son
 * documentos de nómina (14) que apuntan a esta. La ficha las lista para que se
 * vea de qué está hecho el consolidado, y desde ahí se navega a cada una.
 *
 * **Supuestos pendientes de confirmar con backend**: todos los campos, tomados
 * del `serializador=lista_nomina` del legacy.
 */
export interface NominaElectronicaOrigen {
  readonly id: number;
  readonly documento_tipo_nombre?: string | null;
  readonly numero?: string | null;
  /** Periodo liquidado por esa nómina. */
  readonly fecha_desde?: string | null;
  readonly fecha_hasta?: string | null;
  readonly contacto_numero_identificacion?: string | null;
  readonly contacto_nombre_corto?: string | null;
  readonly salario?: string | number | null;
  readonly base_cotizacion?: string | number | null;
  readonly base_prestacion?: string | number | null;
  readonly devengado?: string | number | null;
  readonly deduccion?: string | number | null;
  readonly total?: string | number | null;
  readonly estado_aprobado?: boolean | null;
  readonly estado_anulado?: boolean | null;
}

/**
 * Línea de uno de los **documentos origen**: un concepto liquidado en él.
 *
 * Vive en `/general/documento-detalle/` como toda línea del framework, y llega
 * por `POST …/lista/` filtrando por el `documento_referencia_id` de su
 * documento. Los documentos origen no son solo nóminas: también entran
 * liquidaciones, y `documento_documento_tipo_nombre` dice cuál.
 *
 * El contacto es **el de la línea**: en Salud es la EPS y en Pensión el fondo,
 * no el empleado.
 *
 * Campos confirmados con la respuesta real (2026-10-20). Solo se declaran los
 * que pinta la ficha; el serializador trae muchos más.
 */
export interface NominaElectronicaDetalleRead {
  readonly id: number;
  /** Documento origen (FK cruda, sin `_id`). */
  readonly documento: number;
  readonly documento_documento_tipo_nombre?: string | null;
  readonly documento_fecha?: string | null;
  readonly concepto_id?: number | null;
  readonly concepto_nombre?: string | null;
  readonly contacto_numero_identificacion?: string | null;
  readonly contacto_nombre_corto?: string | null;
  readonly base_cotizacion?: string | number | null;
  readonly base_prestacion?: string | number | null;
  readonly devengado?: string | number | null;
  readonly deduccion?: string | number | null;
  readonly total?: string | number | null;
}
