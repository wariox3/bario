import type { AbstractControl, ValidationErrors } from '@angular/forms';

/** Los montos llevan centavos: comparar con `===` fallaría por el binario. */
const TOLERANCIA = 0.01;

/** Cómo se salda realmente un crédito con el valor de cuota que se eligió. */
export interface PlanDeCuotas {
  /** Cuotas que hacen falta para cubrir el total. */
  readonly cuotas: number;
  /** Valor de la última, menor que el resto cuando el total no se divide exacto. */
  readonly ultima: number;
  /** `true` si la cantidad declarada coincide con la que hace falta. */
  readonly cuadra: boolean;
}

/**
 * Resuelve en cuántas cuotas se salda el crédito y de cuánto es la última.
 *
 * El backend lleva el saldo y descuenta hasta cubrirlo, así que una última cuota
 * menor **no es un error**: es lo normal cuando el total no se divide exacto.
 * Por eso esto informa en vez de validar.
 *
 * `null` cuando falta un dato o no es positivo — de eso se ocupan los validadores
 * de cada campo, y devolver un plan a medias haría aparecer un aviso sobre un
 * formulario que recién se está llenando.
 */
export function planDeCuotas(
  total: number | null,
  cuota: number | null,
  cantidadDeclarada: number | null,
): PlanDeCuotas | null {
  if (!total || !cuota || total <= 0 || cuota <= 0) return null;

  const cuotas = cuotasNecesarias(total, cuota) as number;
  const ultima = Math.round((total - cuota * (cuotas - 1)) * 100) / 100;
  return { cuotas, ultima, cuadra: cantidadDeclarada === cuotas };
}

/**
 * Cuotas que hacen falta para cubrir el total con la cuota elegida. Es el campo
 * **derivado** del formulario: se pacta cuánto se descuenta por período —hay
 * topes legales sobre el salario— y la cantidad sale de ahí.
 */
export function cuotasNecesarias(total: number | null, cuota: number | null): number | null {
  if (!total || !cuota || total <= 0 || cuota <= 0) return null;
  return Math.ceil((total - TOLERANCIA) / cuota);
}

/**
 * Cuota que reparte el total en la cantidad de partes pedida, **en pesos
 * enteros**.
 *
 * **En pesos y hacia arriba**, por dos razones:
 *
 * - Al centavo: el ERP muestra la moneda sin decimales, así que `10.909,09`
 *   produce una cuota y una última que se imprimen iguales (`$ 10.909`) y
 *   difieren en un centavo invisible.
 * - Hacia abajo: `120.000` en 11 quedaría en `10.909`, que multiplicado por 11
 *   deja un peso sin cubrir y **agrega una cuota de $ 1**. Hacia arriba, las
 *   `cantidad` cuotas siempre alcanzan y la última absorbe la diferencia siendo
 *   un poco menor, que es como funciona cualquier crédito.
 */
export function cuotaSugerida(total: number | null, cantidad: number | null): number | null {
  if (!total || !cantidad || total <= 0 || cantidad <= 0) return null;
  return Math.ceil(total / cantidad);
}

/**
 * Si dos montos se imprimen igual, para quien lee **son** iguales: la moneda del
 * ERP no muestra centavos. Sirve para no anunciar una última cuota distinta
 * cuando la diferencia no se ve.
 */
export function mismoMontoVisible(a: number, b: number): boolean {
  return Math.round(a) === Math.round(b);
}

/**
 * La cuota no puede superar el total: un crédito que se salda antes de la primera
 * cuota no es un crédito. Va sobre el grupo porque compara dos campos.
 *
 * Los valores vacíos o no positivos no son asunto de acá: de eso se ocupan
 * `required` y `montoPositivo` en cada control.
 */
export function cuotaNoSuperaTotal(group: AbstractControl): ValidationErrors | null {
  const total = group.get('total')?.value as number | null;
  const cuota = group.get('cuota')?.value as number | null;
  if (!total || !cuota || total <= 0 || cuota <= 0) return null;
  return cuota - total > TOLERANCIA ? { cuotaSuperaTotal: true } : null;
}
