import { fromIsoDate, toFiniteNumber, toIsoDate } from '@reddoc/core';
import type { ErpSelectOption } from '@reddoc/core';
import type { Activo, ActivoPayload } from './activo.model';
import type { ActivoFormRawValue } from './pages/activo-form/activo-form.types';

/** Reagrupa el id de una cuenta contable + su `*_codigo`/`*_nombre` en un `ErpSelectOption`. */
function cuentaOption(
  id: number | null,
  codigo?: string | null,
  nombre?: string | null,
): ErpSelectOption | null {
  if (id == null) return null;
  const label = [codigo, nombre].filter(Boolean).join(' - ');
  return { id, nombre: label || (nombre ?? '') };
}

/**
 * Adapta el read-model (`Activo`) a los valores del reactive form.
 *
 * Las FK se reagrupan en `{ id, nombre }` con el companion `*_nombre` que
 * devuelve el backend (los `<lib-api-select>` resuelven la etiqueta por `id`,
 * pero las cuentas usan `<app-cuenta-select>`, cuya etiqueta es `código - nombre`).
 * Los montos llegan como string Decimal → se normalizan a número.
 */
export function activoToFormValue(a: Activo): Partial<ActivoFormRawValue> {
  return {
    nombre: a.nombre,
    codigo: a.codigo,
    marca: a.marca ?? '',
    serie: a.serie ?? '',
    modelo: a.modelo ?? null,
    fecha_compra: fromIsoDate(a.fecha_compra),
    fecha_activacion: fromIsoDate(a.fecha_activacion),
    fecha_baja: fromIsoDate(a.fecha_baja),
    duracion: a.duracion ?? 0,
    valor_compra: toFiniteNumber(a.valor_compra),
    depreciacion_inicial: toFiniteNumber(a.depreciacion_inicial),
    activo_grupo:
      a.activo_grupo != null ? { id: a.activo_grupo, nombre: a.activo_grupo_nombre ?? '' } : null,
    metodo_depreciacion:
      a.metodo_depreciacion != null
        ? { id: a.metodo_depreciacion, nombre: a.metodo_depreciacion_nombre ?? '' }
        : null,
    cuenta_gasto: cuentaOption(a.cuenta_gasto, a.cuenta_gasto_codigo, a.cuenta_gasto_nombre),
    cuenta_depreciacion: cuentaOption(
      a.cuenta_depreciacion,
      a.cuenta_depreciacion_codigo,
      a.cuenta_depreciacion_nombre,
    ),
    centro_costo:
      a.centro_costo != null ? { id: a.centro_costo, nombre: a.centro_costo_nombre ?? '' } : null,
  };
}

/**
 * Construye el write-model (`ActivoPayload`) desde el valor crudo del form.
 * Las FK exponen solo su `id`; las fechas Date → 'yyyy-mm-dd'; los strings
 * vacíos se normalizan a `null`.
 */
export function formValueToPayload(v: ActivoFormRawValue): ActivoPayload {
  return {
    nombre: v.nombre ?? '',
    codigo: v.codigo ?? '',
    marca: v.marca || null,
    serie: v.serie || null,
    modelo: v.modelo ?? null,
    fecha_compra: toIsoDate(v.fecha_compra),
    fecha_activacion: toIsoDate(v.fecha_activacion),
    fecha_baja: toIsoDate(v.fecha_baja),
    duracion: v.duracion ?? null,
    valor_compra: v.valor_compra ?? null,
    depreciacion_inicial: v.depreciacion_inicial ?? null,
    activo_grupo: v.activo_grupo?.id ?? null,
    metodo_depreciacion: v.metodo_depreciacion?.id ?? null,
    cuenta_gasto: v.cuenta_gasto?.id ?? null,
    cuenta_depreciacion: v.cuenta_depreciacion?.id ?? null,
    centro_costo: v.centro_costo?.id ?? null,
  };
}
