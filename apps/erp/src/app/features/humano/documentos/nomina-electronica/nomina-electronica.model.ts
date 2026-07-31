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
 * Se leen de `/general/documento/` filtrando por `documento_referencia_id`: son
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
 * Línea de la nómina electrónica: un **concepto consolidado** del periodo.
 *
 * Vive en `/general/documento-detalle/` como toda línea del framework. El legacy
 * pintaba además el empleado y el rango de fechas en cada fila, pero todas las
 * líneas son del mismo documento: esos valores son constantes y ya están en la
 * cabecera, así que acá quedan fuera.
 *
 * **Supuestos pendientes de confirmar con backend**: todos los campos.
 */
export interface NominaElectronicaDetalleRead {
  readonly id: number;
  readonly concepto_id?: number | null;
  readonly concepto_nombre?: string | null;
  readonly base_cotizacion?: string | number | null;
  readonly base_prestacion?: string | number | null;
  readonly devengado?: string | number | null;
  readonly deduccion?: string | number | null;
  readonly total?: string | number | null;
}
