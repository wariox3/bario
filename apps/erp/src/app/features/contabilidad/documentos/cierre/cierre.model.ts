/**
 * Contratos de datos de la **cabecera** de Cierre contable.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo`. Las interfaces
 * **extienden** el contrato base común a cualquier documento (`Documento*Base`
 * en `@reddoc/core`), agregando solo los campos propios del cierre.
 *
 * La cabecera es corta: tercero, fecha (siempre un 31 de diciembre), el grupo de
 * contabilidad y el comentario.
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';

/** Read-model (GET `/documento/:id/`) de la cabecera de un cierre. */
export interface CierreRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  /** Grupo de contabilidad al que se imputa el cierre. */
  readonly grupo_contabilidad: number | null;
  readonly grupo_contabilidad_nombre?: string | null;
  readonly comentario: string | null;
}

/**
 * Body (POST/PATCH) de un cierre.
 *
 * **Sin `detalles`**: las líneas no se crean desde el front, las genera el
 * backend con `cargar-cierre/`.
 */
export interface CierrePayload extends DocumentoPayloadBase {
  readonly grupo_contabilidad: number | null;
  readonly comentario: string | null;
}

/**
 * Body de `cargar-cierre/`: el rango de cuentas de resultado a cerrar (por
 * **código**) y la cuenta donde se acumula el resultado del ejercicio (por
 * **id**). La asimetría código/id viene del ERP legacy.
 */
export interface CargarCierrePayload {
  readonly id: number;
  readonly cuenta_desde_codigo: string;
  readonly cuenta_hasta_codigo: string;
  readonly cuenta_cierre_id: number;
}
