import type { FormBuilder } from '@angular/forms';
import { buildFiltros, toIsoDate, type ErpSelectOption, type FilterCondition } from '@reddoc/core';
import { finDelMes, inicioDelMes } from '../../shared/informe-cuentas.utils';
import { rangoFechasMismoAnio } from '../../shared/informe-cuentas.validators';
import type { BalancePruebaForm, BalancePruebaParams } from './balance-prueba.model';

/** Propiedad por la que el backend acota el rango de cuentas. */
export const CUENTA_CODIGO_FIELD = 'cuenta__codigo';

/**
 * Arma el formulario de parámetros del balance de prueba: el mes en curso, el
 * rango de cuentas vacío (= todo el plan), `solo_con_saldo` marcado —el default
 * del backend— e `incluir_cierre` apagado, como en el ERP anterior.
 *
 * El validador exige que ambas fechas caigan en el **mismo año**: el saldo
 * anterior se calcula contra la apertura del ejercicio, así que un rango a
 * caballo entre dos años daría un balance que no cuadra.
 */
export function buildBalancePruebaForm(fb: FormBuilder): BalancePruebaForm {
  return fb.nonNullable.group(
    {
      fecha_desde: [inicioDelMes()],
      fecha_hasta: [finDelMes()],
      cuenta_desde: [null as ErpSelectOption | null],
      cuenta_hasta: [null as ErpSelectOption | null],
      solo_con_saldo: [true],
      incluir_cierre: [false],
    },
    { validators: rangoFechasMismoAnio('fecha_desde', 'fecha_hasta') },
  );
}

/**
 * Código de la cuenta elegida. `<app-cuenta-select>` lo expone suelto en la
 * opción (además de la etiqueta `"1105 - Caja general"`), así que no hace falta
 * recortarlo del label como hacen los informes de la familia vieja.
 */
function codigoDe(option: ErpSelectOption | null): string {
  const codigo = option?.['codigo'];
  return typeof codigo === 'string' ? codigo : '';
}

/**
 * Traduce el rango de cuentas a los filtros dinámicos del backend.
 *
 * Cada extremo es independiente: el que quede vacío simplemente no genera
 * filtro (rango abierto). El `AND` solo se declara a partir del segundo, que es
 * lo único que el backend necesita —evalúa la lista en secuencia y asume `AND`
 * cuando la clave no viene.
 */
export function buildFiltrosCuenta(form: BalancePruebaForm): readonly FilterCondition[] {
  const { cuenta_desde, cuenta_hasta } = form.getRawValue();
  const conditions: FilterCondition[] = [];

  const desde = codigoDe(cuenta_desde);
  if (desde) conditions.push({ field: CUENTA_CODIGO_FIELD, operator: 'gte', value: desde });

  const hasta = codigoDe(cuenta_hasta);
  if (hasta) {
    conditions.push({
      field: CUENTA_CODIGO_FIELD,
      operator: 'lte',
      value: hasta,
      ...(conditions.length > 0 ? { logic: 'AND' as const } : {}),
    });
  }

  return conditions;
}

/** Traduce el formulario al body del informe (sin el discriminador `informe`). */
export function buildBalancePruebaParams(form: BalancePruebaForm): BalancePruebaParams {
  const value = form.getRawValue();
  return {
    fecha_desde: toIsoDate(value.fecha_desde) ?? '',
    fecha_hasta: toIsoDate(value.fecha_hasta) ?? '',
    solo_con_saldo: value.solo_con_saldo,
    incluir_cierre: value.incluir_cierre,
    filtros: buildFiltros(buildFiltrosCuenta(form)),
  };
}
