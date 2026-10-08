import type { FormBuilder, ValidatorFn } from '@angular/forms';
import { buildFiltros, toIsoDate, type ErpSelectOption, type FilterCondition } from '@reddoc/core';
import { rangoFechasMismoAnio } from './rango-fechas.validators';
import type { MovimientoInformeForm, MovimientoInformeParams } from './movimiento-informe.types';

/** Primer día del mes en curso — valor inicial de `fecha_desde`. */
function inicioDelMes(): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}

/** Último día del mes en curso — valor inicial de `fecha_hasta`. */
function finDelMes(): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
}

/**
 * Propiedades por las que el backend acota el informe. **Confirmadas con backend**
 * (2026-09-07); no se deducen de otro endpoint.
 *
 * El informe declara su **propia** `campos_filtrables`, y no espeja la de
 * `/contabilidad/movimiento/lista/` aunque filtre el mismo queryset. Se intentó
 * deducirla de allá (`contacto__numero_identificacion`, `comprobante__nombre`) y
 * **no funciona**: acá las relaciones van por **id con sufijo `_id`**.
 */
export const INFORME_FILTER_FIELD = {
  cuentaCodigo: 'cuenta__codigo',
  contactoId: 'contacto_id',
  numero: 'numero',
  comprobanteId: 'comprobante_id',
  /**
   * **Sin confirmar.** Sigue la convención de las otras dos FK del informe
   * (`contacto_id`, `comprobante_id`), que backend sí confirmó, pero
   * `centro_costo` no estaba en esa lista. Ojo: no es lo mismo que el `grupo` de
   * los estados financieros, que es un nivel del plan de cuentas.
   */
  centroCostoId: 'centro_costo_id',
} as const;

/** Propiedad por la que el backend acota el rango de cuentas. */
export const CUENTA_CODIGO_FIELD = INFORME_FILTER_FIELD.cuentaCodigo;

/**
 * Arma el formulario de parámetros común: el mes en curso, el rango de cuentas
 * vacío (= todo el plan) y `solo_con_saldo` marcado.
 *
 * `solo_con_saldo` arranca encendido aunque el default del backend sea `false`:
 * un informe que abre con el plan de cuentas completo —incluidas las que nunca
 * movieron— es ruido en la primera pantalla. Viaja siempre explícito.
 *
 * El validador por defecto exige que ambas fechas caigan en el **mismo año**:
 * los cinco informes jerárquicos calculan el saldo anterior contra la apertura
 * del ejercicio, así que un rango a caballo entre dos años daría un informe que
 * no cuadra. Los informes planos, que no tienen saldo anterior, pueden pasar
 * `rangoFechas` a secas.
 */
export function buildMovimientoInformeForm(
  fb: FormBuilder,
  rangeValidator: ValidatorFn = rangoFechasMismoAnio('fecha_desde', 'fecha_hasta'),
): MovimientoInformeForm {
  return fb.nonNullable.group(
    {
      fecha_desde: [inicioDelMes()],
      fecha_hasta: [finDelMes()],
      cuenta_desde: [null as ErpSelectOption | null],
      cuenta_hasta: [null as ErpSelectOption | null],
      solo_con_saldo: [true],
    },
    { validators: rangeValidator },
  );
}

/**
 * Código de la cuenta elegida. `<app-cuenta-select>` lo expone suelto en la
 * opción (además de la etiqueta `"1105 - Caja general"`), así que se lee de ahí
 * y no se recorta del label.
 */
function codigoDe(option: ErpSelectOption | null): string {
  const codigo = option?.['codigo'];
  return typeof codigo === 'string' ? codigo : '';
}

/**
 * Traduce el rango de cuentas a los filtros dinámicos del backend.
 *
 * Cada extremo es independiente: el que quede vacío simplemente no genera
 * filtro (rango abierto). No declara `logic` — el encadenado lo pone
 * `encadenarConY`, que es el único que conoce la posición final de cada filtro.
 */
export function buildFiltrosCuenta(form: MovimientoInformeForm): readonly FilterCondition[] {
  const { cuenta_desde, cuenta_hasta } = form.getRawValue();
  const conditions: FilterCondition[] = [];

  const desde = codigoDe(cuenta_desde);
  if (desde) conditions.push({ field: CUENTA_CODIGO_FIELD, operator: 'gte', value: desde });

  const hasta = codigoDe(cuenta_hasta);
  if (hasta) conditions.push({ field: CUENTA_CODIGO_FIELD, operator: 'lte', value: hasta });

  return conditions;
}

/**
 * Declara `AND` en todos los filtros menos el primero, que es como los manda el
 * backend en sus ejemplos.
 *
 * Va acá y no en cada builder porque **la posición solo se conoce al final**: un
 * filtro de detalle es el primero de la lista si no se eligió rango de cuentas,
 * y el segundo si sí. Que cada builder lo decidiera por su cuenta fue lo que
 * dejó listas sin encadenar cuando el rango venía vacío.
 *
 * El primero pierde cualquier `logic` que traiga: encadenar con el filtro
 * anterior no significa nada cuando no hay anterior.
 */
function encadenarConY(conditions: readonly FilterCondition[]): readonly FilterCondition[] {
  return conditions.map((condition, index) =>
    index === 0
      ? { ...condition, logic: undefined }
      : { ...condition, logic: condition.logic ?? ('AND' as const) },
  );
}

/**
 * Traduce el formulario al body del informe (sin el discriminador `informe`).
 *
 * `extraFilters` son los filtros propios del informe —tercero, comprobante,
 * número—, que van **después** del rango de cuentas. El `AND` entre todos lo
 * pone `encadenarConY` sobre la lista ya concatenada.
 */
export function buildMovimientoInformeParams(
  form: MovimientoInformeForm,
  extraFilters: readonly FilterCondition[] = [],
): MovimientoInformeParams {
  const value = form.getRawValue();
  return {
    fecha_desde: toIsoDate(value.fecha_desde) ?? '',
    fecha_hasta: toIsoDate(value.fecha_hasta) ?? '',
    solo_con_saldo: value.solo_con_saldo,
    filtros: buildFiltros(encadenarConY([...buildFiltrosCuenta(form), ...extraFilters])),
  };
}

/**
 * Parámetros de detalle. Todos opcionales: cada informe pasa los suyos y el que
 * no venga no genera filtro.
 */
export interface FiltrosDetalleInput {
  /** Opción del `<lib-contacto-select>`; se filtra por su id. */
  readonly contacto?: ErpSelectOption | null;
  readonly numero?: number | null;
  /** Opción del selector de comprobantes; se filtra por su id. */
  readonly comprobante?: ErpSelectOption | null;
  /** Opción del selector de centros de costo; se filtra por su id. */
  readonly centroCosto?: ErpSelectOption | null;
}

/**
 * Traduce los parámetros de detalle a filtros dinámicos.
 *
 * Contacto y comprobante viajan por **id** (`contacto_id`, `comprobante_id`),
 * que es justo lo que dan los dos selectores — no hay que sacar ningún campo de
 * la opción. Filtrar por identificación o por nombre **no funciona**: no están
 * en la whitelist del informe.
 *
 * Ninguno declara `logic`: lo pone `encadenarConY` cuando ya conoce la posición
 * final de cada filtro en la lista.
 */
export function buildFiltrosDetalle(input: FiltrosDetalleInput): readonly FilterCondition[] {
  const conditions: FilterCondition[] = [];

  // Mismo orden que los ejemplos del backend (número · contacto · comprobante):
  // entre filtros encadenados con AND da igual, pero comparar el body contra el
  // ejemplo cuando algo falla es mucho más rápido si coinciden.
  // `0` es un número de documento válido, así que se compara contra null/undefined.
  if (input.numero !== null && input.numero !== undefined) {
    conditions.push({ field: INFORME_FILTER_FIELD.numero, operator: 'eq', value: input.numero });
  }

  if (input.contacto) {
    conditions.push({
      field: INFORME_FILTER_FIELD.contactoId,
      operator: 'eq',
      value: input.contacto.id,
    });
  }

  if (input.comprobante) {
    conditions.push({
      field: INFORME_FILTER_FIELD.comprobanteId,
      operator: 'eq',
      value: input.comprobante.id,
    });
  }

  if (input.centroCosto) {
    conditions.push({
      field: INFORME_FILTER_FIELD.centroCostoId,
      operator: 'eq',
      value: input.centroCosto.id,
    });
  }

  return conditions;
}
