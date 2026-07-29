import { fromIsoDate, toIsoDate } from '@reddoc/core';
import type { DepreciacionRead, DepreciacionPayload } from './depreciacion.model';
import type { DepreciacionFormRawValue } from './depreciacion-form.types';

/** Read-model (GET) → valores de cabecera del formulario (edición). */
export function depreciacionToFormValue(read: DepreciacionRead): Partial<DepreciacionFormRawValue> {
  return {
    contacto:
      read.contacto != null ? { id: read.contacto, nombre: read.contacto_nombre ?? '' } : null,
    fecha: fromIsoDate(read.fecha),
    centro_costo:
      read.centro_costo != null
        ? { id: read.centro_costo, nombre: read.centro_costo_nombre ?? '' }
        : null,
    comentario: read.comentario,
  };
}

/**
 * Valores del formulario → payload de la API.
 *
 * `documento_tipo` proviene del `documentTypeId` del `DocumentEntityConfig`. El
 * `total` no se teclea ni sale del form: lo pasa el llamador, ya sumado desde las
 * líneas que generó el backend. En alta todavía no hay líneas, así que va en 0.
 */
export function formValueToPayload(
  raw: DepreciacionFormRawValue,
  documentTypeId: number,
  total: number,
): DepreciacionPayload {
  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    centro_costo: raw.centro_costo?.id ?? null,
    comentario: raw.comentario,
    total: total.toFixed(2),
  };
}
