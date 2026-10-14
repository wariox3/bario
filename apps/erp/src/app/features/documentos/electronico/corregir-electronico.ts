import {
  fromIsoDate,
  resolucionDesdeRead,
  toFiniteNumber,
  toIsoDate,
  type ErpSelectOption,
} from '@reddoc/core';

/**
 * Modelo y diff de la **corrección DIAN** (dropdown Electrónico): la cabecera
 * que viaja en lo emitido —número, resolución, fecha, vencimiento y, en las notas, el
 * concepto de corrección—. Módulo
 * puro: sin Angular ni HTTP, testeado en `corregir-electronico.spec.ts`.
 *
 * Gemelo de `corregir-documento.ts` (la corrección contable): el diálogo parte
 * de lo que trae el backend y al guardar manda en un solo
 * `actualizar-electronico/` **solo lo que cambió**.
 */

/** Lo que el diálogo necesita del read de la cabecera (`general/documento/{id}/`). */
export interface CorregirElectronicoRead {
  readonly numero?: string | number | null;
  readonly fecha?: string | null;
  readonly fecha_vence?: string | null;
  readonly resolucion?: number | null;
  readonly resolucion_prefijo?: string | null;
  readonly resolucion_numero?: string | null;
  readonly documento_concepto_correccion?: number | null;
  readonly documento_concepto_correccion_nombre?: string | null;
}

/** Valor del formulario del diálogo. */
export interface CabeceraElectronica {
  readonly numero: number | null;
  readonly resolucion: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly fechaVence: Date | null;
  /** Motivo DIAN de la nota; los documentos que no son nota lo dejan en `null`. */
  readonly conceptoCorreccion: ErpSelectOption | null;
}

/** Cambios de cabecera: solo las claves que cambiaron. Fechas en ISO (`2026-08-05`). */
export interface CabeceraElectronicaPatch {
  numero?: number | null;
  resolucion?: number | null;
  fecha?: string | null;
  fecha_vence?: string | null;
  documento_concepto_correccion?: number | null;
}

export function aCabeceraElectronica(read: CorregirElectronicoRead): CabeceraElectronica {
  return {
    numero: toFiniteNumber(read.numero),
    resolucion: resolucionDesdeRead(read),
    fecha: fromIsoDate(read.fecha),
    fechaVence: fromIsoDate(read.fecha_vence),
    conceptoCorreccion:
      read.documento_concepto_correccion != null
        ? {
            id: read.documento_concepto_correccion,
            nombre: read.documento_concepto_correccion_nombre ?? '',
          }
        : null,
  };
}

/** Lo que cambió; `null` si nada. Las fechas se comparan por día, no por instante. */
export function cambiosCabeceraElectronica(
  original: CabeceraElectronica,
  actual: CabeceraElectronica,
): CabeceraElectronicaPatch | null {
  const patch: CabeceraElectronicaPatch = {};
  if (original.numero !== actual.numero) patch.numero = actual.numero;
  if ((original.resolucion?.id ?? null) !== (actual.resolucion?.id ?? null)) {
    patch.resolucion = actual.resolucion?.id ?? null;
  }
  const fecha = toIsoDate(actual.fecha);
  if (toIsoDate(original.fecha) !== fecha) patch.fecha = fecha;
  const fechaVence = toIsoDate(actual.fechaVence);
  if (toIsoDate(original.fechaVence) !== fechaVence) patch.fecha_vence = fechaVence;
  const concepto = actual.conceptoCorreccion?.id ?? null;
  if ((original.conceptoCorreccion?.id ?? null) !== concepto) {
    patch.documento_concepto_correccion = concepto;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}
