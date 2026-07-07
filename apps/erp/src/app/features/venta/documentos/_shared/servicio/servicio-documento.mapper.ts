import { fromHora, fromIsoDate, toFiniteNumber, toHora, toIsoDate } from '@reddoc/core';
import type {
  ServicioDocumentoRead,
  ServicioDocumentoPayload,
  ServicioDocumentoDetalleRead,
  ServicioDocumentoDetallePayload,
} from './servicio-documento.model';
import type { DetalleFormRawValue } from './servicio-documento-detalle.types';
import type { ServicioDocumentoFormRawValue } from './servicio-documento-form.types';

/**
 * Read-model (GET) → valores de cabecera del formulario (edición).
 * No incluye `detalles` (se poblan aparte en el `FormArray`).
 */
export function servicioDocumentoToFormValue(
  read: ServicioDocumentoRead,
): Partial<Omit<ServicioDocumentoFormRawValue, 'detalles'>> {
  return {
    contacto:
      read.contacto != null ? { id: read.contacto, nombre: read.contacto_nombre ?? '' } : null,
    fecha: fromIsoDate(read.fecha),
    sector: read.sector != null ? { id: read.sector, nombre: read.sector_nombre ?? '' } : null,
    estrato: read.estrato,
    salario: toFiniteNumber(read.salario),
  };
}

/** Flags `lunes…domingo` → array de índices (0=lunes … 6=domingo), como el calcPayload. */
const DIA_FLAGS = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const;

function diasSemanaFromFlags(read: ServicioDocumentoDetalleRead): number[] {
  return DIA_FLAGS.flatMap((flag, idx) => (read[flag] ? [idx] : []));
}

export function detalleToFormValue(
  read: ServicioDocumentoDetalleRead,
  salarioDoc: number | null,
): DetalleFormRawValue {
  const precio = toFiniteNumber(read.precio);
  return {
    id: read.id ?? null,
    item:
      read.item != null
        ? { id: read.item, nombre: read.item_nombre ?? '', precio: precio ?? 0 }
        : null,
    cantidad: toFiniteNumber(read.cantidad),
    precio,
    fecha_desde: fromIsoDate(read.fecha_desde),
    fecha_hasta: fromIsoDate(read.fecha_hasta),
    hora_desde: fromHora(read.hora_desde),
    hora_hasta: fromHora(read.hora_hasta),
    modalidad:
      read.modalidad != null ? { id: read.modalidad, nombre: read.modalidad_nombre ?? '' } : null,
    puesto: read.puesto != null ? { id: read.puesto, nombre: read.puesto_nombre ?? '' } : null,
    salario: toFiniteNumber(read.salario) ?? salarioDoc,
    programar: read.programar ?? false,
    dias_semana: diasSemanaFromFlags(read),
    festivo: read.festivo ?? false,
    cortesia: read.cortesia ?? false,
    compuesto: read.compuesto ?? false,
    impuestos_ids: (read.impuestos ?? []).map((imp) => imp.impuesto),
    impuestos_totales: (read.impuestos ?? []).map((imp) => ({
      id: imp.impuesto,
      nombre: imp.impuesto_nombre ?? '',
      total: Math.round(parseFloat(imp.total ?? '0')),
    })),
    horas: toFiniteNumber(read.horas),
    horas_diurnas: toFiniteNumber(read.horas_diurnas),
    horas_nocturnas: toFiniteNumber(read.horas_nocturnas),
    precio_minimo: toFiniteNumber(read.precio_minimo),
    documento_detalle_afectado: read.documento_detalle_afectado ?? null,
  };
}

/**
 * Valores del formulario → payload de la API.
 *
 * `documento_tipo` proviene del `documentTypeId` del `DocumentEntityConfig`.
 * Las líneas del FormArray se traducen a `detalles`.
 */
export function formValueToPayload(
  raw: ServicioDocumentoFormRawValue,
  documentTypeId: number,
  includeDetalles = true,
): ServicioDocumentoPayload {
  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    sector: raw.sector?.id ?? null,
    estrato: raw.estrato ?? null,
    salario: raw.salario ?? null,
    fecha: toIsoDate(raw.fecha),
    // En edición se omiten: los detalles transaccionan contra documento-detalle.
    ...(includeDetalles ? { detalles: raw.detalles.map(detalleToPayload) } : {}),
  };
}

/** Una línea del form → body de documento-detalle (POST/PATCH) o detalle embebido. */
export function detalleToPayload(raw: DetalleFormRawValue): ServicioDocumentoDetallePayload {
  const dias = new Set(raw.dias_semana);
  return {
    item: raw.item?.id ?? null,
    cantidad: raw.cantidad ?? null,
    precio: (raw.precio ?? 0).toFixed(2),
    fecha_desde: toIsoDate(raw.fecha_desde),
    fecha_hasta: toIsoDate(raw.fecha_hasta),
    hora_desde: toHora(raw.hora_desde),
    hora_hasta: toHora(raw.hora_hasta),
    modalidad: raw.modalidad?.id ?? null,
    puesto: raw.puesto?.id ?? null,
    salario: raw.salario ?? null,
    programar: raw.programar,
    // dias_semana → flags individuales (0=lunes … 6=domingo), como supervigilancia.
    lunes: dias.has(0),
    martes: dias.has(1),
    miercoles: dias.has(2),
    jueves: dias.has(3),
    viernes: dias.has(4),
    sabado: dias.has(5),
    domingo: dias.has(6),
    festivo: raw.festivo,
    cortesia: raw.cortesia,
    compuesto: raw.compuesto,
    // Horas y precio mínimo del tarifador (string con 2 decimales, como `precio`).
    // En edición sin recálculo, round-trip de lo cargado; si faltan, 0.
    horas: (raw.horas ?? 0).toFixed(2),
    horas_diurnas: (raw.horas_diurnas ?? 0).toFixed(2),
    horas_nocturnas: (raw.horas_nocturnas ?? 0).toFixed(2),
    precio_minimo: (raw.precio_minimo ?? 0).toFixed(2),
    impuestos_ids: raw.impuestos_ids,
    documento_detalle_afectado: raw.documento_detalle_afectado,
  };
}
