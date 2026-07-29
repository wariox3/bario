import { fromIsoDate, toIsoDate } from '@reddoc/core';
import type { CierreRead, CierrePayload } from './cierre.model';
import type { CierreFormRawValue } from './cierre-form.types';

/** Read-model (GET) → valores de cabecera del formulario (edición). */
export function cierreToFormValue(read: CierreRead): Partial<CierreFormRawValue> {
  return {
    contacto:
      read.contacto != null ? { id: read.contacto, nombre: read.contacto_nombre ?? '' } : null,
    fecha: fromIsoDate(read.fecha),
    grupo_contabilidad:
      read.grupo_contabilidad != null
        ? { id: read.grupo_contabilidad, nombre: read.grupo_contabilidad_nombre ?? '' }
        : null,
    comentario: read.comentario,
  };
}

/**
 * Valores del formulario → payload de la API.
 *
 * `documento_tipo` proviene del `documentTypeId` del `DocumentEntityConfig`.
 *
 * **Sin `total`**: a diferencia del asiento y la depreciación, el cierre no manda
 * total. El legacy tenía el control en el formulario pero su `calcularTotales()`
 * nunca corría (el form no tiene líneas), así que siempre viajaba en 0 — mandar
 * un cero fabricado es peor que no mandar nada. Ver PENDIENTES §8.
 */
export function formValueToPayload(raw: CierreFormRawValue, documentTypeId: number): CierrePayload {
  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    grupo_contabilidad: raw.grupo_contabilidad?.id ?? null,
    comentario: raw.comentario,
  };
}
