import type { FormControl, FormGroup } from '@angular/forms';
import type { BackendFilter, ErpSelectOption } from '@reddoc/core';

/**
 * Contrato de los **informes agregados sobre el movimiento contable**, servidos
 * por `/contabilidad/movimiento-informe/` en tres acciones con el **mismo body**:
 * `lista/` (paginada), `excel/` y `totales/`.
 *
 * Los **nueve** informes contables del ERP viven acá. Lo que define todo lo
 * demás de la familia:
 *
 * - El informe se elige con el discriminador `informe` del body.
 * - **Pagina** (`{ count, results }`), y por eso los totales de cuadre salen de
 *   una acción aparte: sumar la página daría el total de 25 filas.
 * - Acota con los **filtros dinámicos** genéricos (`{propiedad, operador,
 *   valor}`), aplicados *antes* de agrupar, así que recortan por igual el saldo
 *   anterior, el movimiento del rango y el detalle.
 * - **No acepta `ordenamientos`**: sale siempre por código de cuenta. Dentro de
 *   una cuenta el orden lo fija el informe, y reordenar por encima despegaría el
 *   detalle de su cuenta.
 */

/**
 * Los nueve informes del enum `informe`. Cinco son **jerárquicos** —recorren el
 * plan de cuentas con más o menos detalle colgando de cada auxiliar— y cuatro
 * son **planos**, sin jerarquía ni subtotales.
 */
export type InformeId =
  | 'auxiliar_contacto'
  | 'auxiliar_cuenta'
  | 'auxiliar_general'
  | 'balance_prueba'
  | 'balance_prueba_contacto'
  | 'bases'
  | 'certificado_retencion'
  | 'estado_resultados'
  | 'estado_situacion_financiera';

/**
 * Qué es cada fila de un informe jerárquico. **Es lo único que distingue un
 * subtotal de una cuenta**, así que la tabla no puede ignorarlo: pintarlo todo
 * igual haría leer los importes duplicados, porque los subtotales están hechos
 * de los auxiliares que vienen debajo.
 *
 * Los cuatro primeros son los subtotales del plan; `AUXILIAR` es la cuenta de
 * movimiento —la única que trae `cuenta_id`— y `TERCERO` / `MOVIMIENTO` son el
 * detalle que cuelga de ella según el informe.
 */
export type InformeFilaTipo =
  | 'CLASE'
  | 'GRUPO'
  | 'CUENTA'
  | 'SUBCUENTA'
  | 'AUXILIAR'
  | 'TERCERO'
  | 'MOVIMIENTO';

/**
 * Las columnas de **importe** que puede declarar un informe. Cada uno pide las
 * suyas y no hay un set común: los jerárquicos traen los cuatro saldos, `bases`
 * trae `debito`/`credito`/`base`, el certificado de retención `base_retenido` y
 * `retenido`, y los estados financieros un único `saldo`.
 *
 * Por eso la tabla compartida recibe sus columnas de importe **como dato** en
 * vez de tenerlas fijas: con banderas harían falta cuatro combinaciones que no
 * comparten ninguna columna entre sí.
 */
export type InformeMontoField =
  | 'saldo_anterior'
  | 'debito'
  | 'credito'
  | 'saldo_final'
  | 'base'
  | 'base_retenido'
  | 'retenido'
  | 'saldo';

/** Una columna de importe: de qué campo sale y con qué etiqueta se pinta. */
export interface InformeMontoColumn {
  readonly field: InformeMontoField;
  readonly label: string;
}

/**
 * Lo que identifica a una fila en cualquier informe de la familia. Los montos y
 * el detalle se suman aparte porque cambian informe por informe.
 *
 * Los montos llegan como **string decimal** (`"120600.000000"`); se formatean
 * con `formatCop`, que ya los normaliza.
 */
export interface InformeFilaIdentidad {
  readonly tipo: InformeFilaTipo;
  /** En los jerárquicos, solo las filas `AUXILIAR` lo traen; en los subtotales es `null`. */
  readonly cuenta_id: number | null;
  readonly codigo: string;
  readonly nombre: string;
}

/** Los cuatro saldos de los informes que recorren el plan de cuentas. */
export interface InformeSaldosMontos {
  readonly saldo_anterior: string;
  readonly debito: string;
  readonly credito: string;
  readonly saldo_final: string;
}

/** Columnas del tercero, en los informes que abren el saldo por contacto. */
export interface InformeContactoExtra {
  readonly contacto_id: number | null;
  readonly identificacion: string | null;
  readonly contacto: string | null;
}

/**
 * Referencia al asiento que originó la fila. La traen los tres auxiliares en sus
 * filas de tipo `MOVIMIENTO`; en los subtotales y en las de tipo `TERCERO` viene
 * `null`.
 */
export interface InformeMovimientoRef {
  readonly movimiento_id: number | null;
}

/** Cómo se identifica el asiento de cara al usuario. */
export interface InformeDocumentoExtra {
  readonly comprobante: string | null;
  readonly numero: number | string | null;
  /** Fecha del movimiento (`yyyy-MM-dd`). */
  readonly fecha: string | null;
}

/**
 * Dónde cae la cuenta en el plan. Solo la traen los **estados financieros**, que
 * no recorren la jerarquía fila por fila —no tienen subtotales— sino que ubican
 * cada cuenta con su clase y su grupo en columnas propias.
 */
export interface InformeUbicacionExtra {
  readonly clase: string | null;
  readonly grupo: string | null;
}

/** El texto escrito al contabilizar la línea. */
export interface InformeDetalleExtra {
  readonly detalle: string | null;
}

/** Fila base de los informes jerárquicos (`ConMovimientoInformeBalance`). */
export interface InformeSaldosRow extends InformeFilaIdentidad, InformeSaldosMontos {}

/** Fila de los informes que abren el saldo **por tercero**. */
export interface InformeContactoRow extends InformeSaldosRow, InformeContactoExtra {}

/**
 * Fila del **auxiliar de cuenta**: el plan de cuentas con una fila por asiento
 * del rango colgando de cada auxiliar.
 *
 * Es lo mínimo que puede ser una fila de detalle: identifica el asiento **solo
 * por su id**, sin comprobante, número ni fecha. Ver la nota de la página sobre
 * ese hueco.
 */
export interface InformeAuxiliarCuentaRow extends InformeSaldosRow, InformeMovimientoRef {}

/**
 * Fila del **auxiliar por contacto**: cada tercero seguido de sus asientos, así
 * que suma la referencia al movimiento sobre las columnas del tercero.
 */
export interface InformeAuxiliarContactoRow extends InformeContactoRow, InformeMovimientoRef {}

/**
 * Fila del **auxiliar general**, la más ancha de los jerárquicos: sobre las del
 * auxiliar por contacto suma cómo se identifica el asiento.
 */
export interface InformeMovimientoRow extends InformeAuxiliarContactoRow, InformeDocumentoExtra {}

/**
 * Fila del informe **Base**, el primero de los **planos**: una línea contable
 * con su base gravable, el documento que la originó, su tercero y el detalle
 * escrito al contabilizar.
 *
 * No recorre el plan de cuentas, así que **no tiene saldo anterior ni final**:
 * sus importes son `debito`, `credito` y `base`.
 */
export interface InformeBasesRow
  extends
    InformeFilaIdentidad,
    InformeContactoExtra,
    InformeMovimientoRef,
    InformeDocumentoExtra,
    InformeDetalleExtra {
  readonly debito: string;
  readonly credito: string;
  readonly base: string;
}

/**
 * Fila del **certificado de retención**: lo que se le retuvo a cada tercero,
 * agrupado por cuenta de retención.
 *
 * Plano y **el más angosto de los nueve**: identidad de cuenta, tercero y dos
 * importes. No es un corte contable sino un resumen fiscal, así que no tiene
 * saldos ni referencia al asiento.
 */
export interface InformeCertificadoRow extends InformeFilaIdentidad, InformeContactoExtra {
  /** Base sobre la que se calculó la retención. */
  readonly base_retenido: string;
  /** Valor retenido. */
  readonly retenido: string;
}

/**
 * Fila de los **estados financieros** (resultados y situación financiera): una
 * cuenta con su saldo, ubicada en el plan por clase y grupo.
 *
 * Los dos informes comparten forma exacta. Son planos: un único importe y sin
 * jerarquía, porque la ubicación va en columnas en vez de en filas de subtotal.
 */
export interface InformeEstadoRow extends InformeFilaIdentidad, InformeUbicacionExtra {
  readonly saldo: string;
}

/**
 * Lo que acepta la tabla compartida: la identidad de la fila más **cualquier**
 * combinación de montos y de columnas opcionales. Qué se pinta lo decide el
 * informe —los montos como dato, el resto por bloques—, no la fila.
 */
export type InformeTableRow = InformeFilaIdentidad &
  Partial<Record<InformeMontoField, string>> &
  Partial<
    InformeContactoExtra &
      InformeMovimientoRef &
      InformeDocumentoExtra &
      InformeDetalleExtra &
      InformeUbicacionExtra
  >;

/**
 * Totales del informe **completo**, servidos por `totales/`. Trae solo los
 * campos que ese informe declara.
 *
 * En los jerárquicos suma **solo las filas de tipo `AUXILIAR`**: los subtotales
 * y el detalle están hechos de ellas, así que sumarlo todo multiplicaría el
 * balance. En los planos, que no tienen jerarquía, suma todas sus filas.
 */
export type InformeTotales = Readonly<Partial<Record<InformeMontoField, string>>>;

/**
 * Body del informe, sin el discriminador `informe` (lo pone el servicio).
 * `fecha_desde` y `fecha_hasta` son obligatorias para el backend.
 */
export interface MovimientoInformeParams {
  readonly fecha_desde: string;
  readonly fecha_hasta: string;
  /**
   * `true` omite las cuentas que quedan en ceros en las cuatro columnas, con su
   * detalle. El default del backend es `false`; se manda explícito para que el
   * checkbox mande siempre y no dependa de la ausencia de la clave.
   *
   * En los cuatro informes planos no aplica y el backend lo ignora.
   */
  readonly solo_con_saldo: boolean;
  readonly filtros: readonly BackendFilter[];
}

/**
 * Formulario de parámetros común. El rango de cuentas guarda la opción completa
 * del selector porque el filtro viaja por **código** (`cuenta__codigo`), no por
 * id.
 *
 * No hay `incluir_cierre`: el backend decide el tratamiento del cierre y no lo
 * expone como parámetro (los asientos de cierre entran al saldo anterior pero
 * nunca a las columnas del rango ni al detalle).
 */
export type MovimientoInformeForm = FormGroup<{
  fecha_desde: FormControl<Date>;
  fecha_hasta: FormControl<Date>;
  cuenta_desde: FormControl<ErpSelectOption | null>;
  cuenta_hasta: FormControl<ErpSelectOption | null>;
  solo_con_saldo: FormControl<boolean>;
}>;

/** Un estado vacío: título y pista. Espeja la forma de las claves i18n. */
export interface InformeEmptyCopy {
  readonly title: string;
  readonly sub: string;
}

/**
 * Los dos estados vacíos de un informe. "Todavía no generaste" y "no hay
 * resultados" se leen muy distinto, así que cada informe aporta su propio par
 * en vez de compartir un texto genérico.
 */
export interface InformeEmptyCopySet {
  readonly notGenerated: InformeEmptyCopy;
  readonly noData: InformeEmptyCopy;
}
