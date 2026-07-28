import type { FormBuilder, ValidatorFn } from '@angular/forms';
import { toIsoDate, type ErpSelectOption } from '@reddoc/core';
import type { InformeCuentasForm, InformeCuentasParams } from './informe-cuentas.types';

/** Primer día del mes en curso — valor inicial de `fecha_desde`. */
export function inicioDelMes(): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}

/** Último día del mes en curso — valor inicial de `fecha_hasta`. */
export function finDelMes(): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
}

/**
 * Extrae el código de cuenta de la etiqueta del selector.
 *
 * `<app-cuenta-select>` entrega `{ id, nombre }` donde `nombre` es la etiqueta
 * `"1105 - Caja general"`. El backend quiere el código aparte del id, así que se
 * recorta el primer segmento.
 *
 * TODO(backend/ui): si el backend acota el rango solo por id, este campo sobra;
 * si lo necesita, conviene que el selector exponga la fila cruda en vez de
 * reconstruir el código desde la etiqueta.
 */
export function codigoDeCuenta(option: ErpSelectOption | null): string {
  if (!option?.nombre) return '';
  return option.nombre.split(' - ')[0]?.trim() ?? '';
}

/**
 * Arma el formulario de parámetros común a los informes de saldos por cuenta.
 * Arranca en el mes en curso, como los informes originales; el rango de cuentas
 * vacío significa "todo el plan".
 *
 * El validador de rango se recibe por parámetro porque no todos exigen lo mismo:
 * el balance de prueba pide además que ambas fechas caigan en el mismo año.
 */
export function buildInformeCuentasForm(
  fb: FormBuilder,
  rangeValidator: ValidatorFn,
): InformeCuentasForm {
  return fb.nonNullable.group(
    {
      fecha_desde: [inicioDelMes(), []],
      fecha_hasta: [finDelMes(), []],
      incluir_cierre: [false],
      cuenta_con_movimiento: [false],
      cuenta_desde: [null as ErpSelectOption | null],
      cuenta_hasta: [null as ErpSelectOption | null],
    },
    { validators: rangeValidator },
  );
}

/** Traduce el formulario al contrato del backend (fechas ISO, cuentas id + código). */
export function buildInformeCuentasParams(form: InformeCuentasForm): InformeCuentasParams {
  const value = form.getRawValue();
  return {
    fecha_desde: toIsoDate(value.fecha_desde) ?? '',
    fecha_hasta: toIsoDate(value.fecha_hasta) ?? '',
    incluir_cierre: value.incluir_cierre,
    cuenta_con_movimiento: value.cuenta_con_movimiento,
    cuenta_desde: value.cuenta_desde?.id ?? null,
    cuenta_hasta: value.cuenta_hasta?.id ?? null,
    cuenta_codigo_desde: codigoDeCuenta(value.cuenta_desde),
    cuenta_codigo_hasta: codigoDeCuenta(value.cuenta_hasta),
  };
}
