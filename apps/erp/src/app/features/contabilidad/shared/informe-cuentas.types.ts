import type { FormControl, FormGroup } from '@angular/forms';
import type { ErpSelectOption } from '@reddoc/core';

/**
 * Piezas comunes de los **informes contables de saldos por cuenta**
 * (balance de prueba, auxiliar de cuenta, y los que sigan).
 *
 * Todos comparten la misma forma, distinta a la del resto de listados del ERP:
 *
 * - Se piden con `POST` y un objeto **`parametros`**, no con
 *   `{ filtros, ordenamientos }`.
 * - La respuesta es `{ registros }` **sin paginar ni contar**: el informe se
 *   entrega completo porque el usuario necesita ver los totales cuadrados.
 * - No hay "listado inicial": la página arranca vacía y el usuario **genera** el
 *   reporte con los parámetros que eligió.
 *
 * Lo único que cambia entre ellos es el endpoint y, en algunos, parámetros
 * extra (contacto, comprobante). Por eso el tipo de parámetros de acá es la
 * base: cada informe lo extiende si necesita más.
 */

/** Parámetros comunes. Viajan dentro de `{ parametros }` en el body del POST. */
export interface InformeCuentasParams {
  /** Inicio del periodo (`yyyy-MM-dd`). */
  readonly fecha_desde: string;
  /** Fin del periodo (`yyyy-MM-dd`). */
  readonly fecha_hasta: string;
  /** Incluir los movimientos del comprobante de cierre del periodo. */
  readonly incluir_cierre: boolean;
  /** Ocultar las cuentas que no tuvieron movimiento en el rango. */
  readonly cuenta_con_movimiento: boolean;
  /** Extremos del rango de cuentas (opcional). El backend recibe id y código. */
  readonly cuenta_desde: number | null;
  readonly cuenta_hasta: number | null;
  readonly cuenta_codigo_desde: string;
  readonly cuenta_codigo_hasta: string;
}

/**
 * Fila de saldos: una cuenta contable con su saldo inicial, el movimiento del
 * periodo y el saldo final.
 *
 * `nivel` indica la profundidad en el plan de cuentas (clase, grupo, cuenta,
 * subcuenta…). Los informes originales no lo usaban para pintar jerarquía;
 * queda disponible por si se quiere indentar más adelante.
 */
export interface SaldoCuentaRow {
  readonly id: number;
  readonly codigo: string | null;
  readonly nombre: string | null;
  readonly nivel: number | null;
  /** Saldo al día anterior a `fecha_desde`. */
  readonly saldo_anterior: number | null;
  /** Movimiento débito del periodo. */
  readonly debito: number | null;
  /** Movimiento crédito del periodo. */
  readonly credito: number | null;
  /** Saldo al cierre de `fecha_hasta`. */
  readonly saldo_actual: number | null;
}

/**
 * Fila de los informes que abren el saldo **por tercero**: la misma cuenta
 * aparece una vez por cada contacto con movimiento en ella.
 */
export interface SaldoCuentaContactoRow extends SaldoCuentaRow {
  readonly contacto_numero_identificacion: string | null;
  readonly contacto_nombre_corto: string | null;
}

/**
 * Lo que acepta la tabla compartida: una fila de saldos que **puede** traer los
 * datos del tercero. Las columnas de contacto se muestran o no según el
 * informe, no según la fila.
 */
export type SaldoCuentaTableRow = SaldoCuentaRow & Partial<SaldoCuentaContactoRow>;

/** Parámetros de los informes que además acotan por un tercero. */
export interface InformeCuentasContactoParams extends InformeCuentasParams {
  readonly contacto: number | null;
}

/** Respuesta de los endpoints de informe: el resultado completo, sin envelope paginado. */
export interface InformeContableResponse<TRow> {
  readonly registros: readonly TRow[];
}

/** Formulario de parámetros. Las cuentas guardan la opción completa del selector. */
export type InformeCuentasForm = FormGroup<{
  fecha_desde: FormControl<Date>;
  fecha_hasta: FormControl<Date>;
  incluir_cierre: FormControl<boolean>;
  cuenta_con_movimiento: FormControl<boolean>;
  cuenta_desde: FormControl<ErpSelectOption | null>;
  cuenta_hasta: FormControl<ErpSelectOption | null>;
}>;
