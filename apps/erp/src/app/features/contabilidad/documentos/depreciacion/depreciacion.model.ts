/**
 * Contratos de datos de la **cabecera** de Depreciación.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo`. Las interfaces
 * **extienden** el contrato base común a cualquier documento (`Documento*Base`
 * en `@reddoc/core`), agregando solo los campos propios de la depreciación.
 *
 * La cabecera es la más corta de todas: tercero, fecha, el grupo de contabilidad
 * (obligatorio) y el comentario. No tiene soporte ni comprobante — el formulario
 * del ERP anterior los declaraba pero nunca los renderizaba (ver PENDIENTES).
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';

/** Read-model (GET `/documento/:id/`) de la cabecera de una depreciación. */
export interface DepreciacionRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  /** Grupo de contabilidad al que se imputa la depreciación. */
  readonly grupo_contabilidad: number | null;
  readonly grupo_contabilidad_nombre?: string | null;
  readonly comentario: string | null;
  /** Total depreciado que calcula el backend; llega como string con decimales. */
  readonly total?: string | null;
}

/**
 * Body (POST/PATCH) de una depreciación.
 *
 * **Sin `detalles`**: las líneas no se crean desde el front, las genera el
 * backend con `cargar-activo/`. Es la diferencia de fondo con el asiento.
 */
export interface DepreciacionPayload extends DocumentoPayloadBase {
  readonly grupo_contabilidad: number | null;
  readonly comentario: string | null;
  /** Suma de las líneas cargadas, como string con 2 decimales. */
  readonly total: string;
}
