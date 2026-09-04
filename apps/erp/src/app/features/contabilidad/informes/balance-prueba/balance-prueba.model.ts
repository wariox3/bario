import type { FormControl, FormGroup } from '@angular/forms';
import type { BackendFilter, ErpSelectOption } from '@reddoc/core';

/**
 * Contrato del informe **Balance de prueba** contra
 * `/contabilidad/movimiento-informe/` (acciones `lista/`, `excel/`, `totales/`).
 *
 * A diferencia del resto de la familia —que sigue pidiendo `{ parametros }` a
 * `/contabilidad/movimiento/informe-*` y recibe el informe completo—, este
 * endpoint:
 *
 * - Discrimina el informe con `informe` en el body, como el resto de los
 *   `…-informe/lista/` del ERP (ver `pendiente-facturar.service.ts`).
 * - **Pagina** (`{ count, results }`), y por eso sirve los totales de cuadre en
 *   una acción aparte: sumar la página en el front daría el total de 25 filas.
 * - Acota con los **filtros dinámicos** genéricos (`{propiedad, operador,
 *   valor}`), aplicados *antes* de agrupar, así que recortan por igual el saldo
 *   anterior y el movimiento del rango.
 * - **No acepta `ordenamientos`**: sale siempre por código de cuenta. Sobre un
 *   queryset agrupado, ordenar por un campo fuera del `GROUP BY` cambiaría el
 *   agrupado en silencio.
 */

/**
 * Fila del balance. Los montos llegan como **string decimal**
 * (`"120600.000000"`); se formatean con `formatCop`, que ya los normaliza.
 *
 * El backend abre débito y crédito tanto en el saldo anterior como en el final;
 * la tabla pinta la vista compacta (los netos) y el desglose queda para el
 * Excel.
 */
export interface BalancePruebaRow {
  readonly cuenta_id: number;
  readonly cuenta_codigo: string;
  readonly cuenta_nombre: string;
  readonly saldo_anterior_debito: string;
  readonly saldo_anterior_credito: string;
  /** Neto del saldo anterior (débito − crédito). */
  readonly saldo_anterior: string;
  readonly debito: string;
  readonly credito: string;
  readonly saldo_final_debito: string;
  readonly saldo_final_credito: string;
  /** Neto del saldo final (débito − crédito). */
  readonly saldo_final: string;
}

/**
 * Totales del informe **completo**, servidos por `totales/`. No traen los netos
 * (`saldo_anterior` / `saldo_final`): sumar netos de distinta naturaleza no
 * significa nada, el cuadre se lee en las parejas débito/crédito.
 */
export interface BalancePruebaTotales {
  readonly saldo_anterior_debito: string;
  readonly saldo_anterior_credito: string;
  readonly debito: string;
  readonly credito: string;
  readonly saldo_final_debito: string;
  readonly saldo_final_credito: string;
}

/**
 * Body del informe, sin el discriminador `informe` (lo pone el servicio).
 * `fecha_desde` y `fecha_hasta` son obligatorias para el backend.
 */
export interface BalancePruebaParams {
  readonly fecha_desde: string;
  readonly fecha_hasta: string;
  /**
   * `true` omite las cuentas que no movieron en el rango y llegan con saldo
   * anterior en cero. Es el default del backend; se manda explícito para que el
   * checkbox mande siempre y no dependa de la ausencia de la clave.
   *
   * Reemplaza al `cuenta_con_movimiento` del contrato viejo.
   */
  readonly solo_con_saldo: boolean;
  /**
   * Incluir los movimientos del comprobante de cierre del periodo.
   *
   * **El backend todavía no lo tiene en cuenta** —no está declarado en el schema
   * y se ignora—, pero lo va a soportar, así que el informe lo manda desde ya
   * (confirmado con backend el 2026-09-04). El día que lo implementen, la
   * pantalla no se toca.
   */
  readonly incluir_cierre: boolean;
  readonly filtros: readonly BackendFilter[];
}

/**
 * Formulario de parámetros. El rango de cuentas guarda la opción completa del
 * selector porque el filtro viaja por **código** (`cuenta__codigo`), no por id.
 */
export type BalancePruebaForm = FormGroup<{
  fecha_desde: FormControl<Date>;
  fecha_hasta: FormControl<Date>;
  cuenta_desde: FormControl<ErpSelectOption | null>;
  cuenta_hasta: FormControl<ErpSelectOption | null>;
  solo_con_saldo: FormControl<boolean>;
  incluir_cierre: FormControl<boolean>;
}>;
