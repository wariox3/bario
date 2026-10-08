import type { CarteraTipo, DocumentoPendienteApi } from './agregar-documento.types';

/**
 * Reglas del **cruce de cartera**: dado un documento pendiente elegido en el
 * modal de "agregar documento", con qué cuenta contable y con qué naturaleza
 * entra como línea del documento que lo cruza (pago o egreso).
 *
 * Viven acá —y no en el mapper de la línea contable— porque dependen del
 * contrato de `DocumentoPendienteApi`: si cambia lo que manda el backend, se
 * toca este archivo y nada más.
 */

/** Naturaleza contable de la línea que nace del cruce: **D**ébito o **C**rédito. */
export type NaturalezaCruce = 'D' | 'C';

/** Cuenta contable con la que entra la línea del cruce. */
export interface CuentaCruce {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
}

/** Cuenta y naturaleza resueltas para un documento cruzado. */
export interface CruceResuelto {
  /** `null` cuando el tipo no declara cuenta: la línea nace sin ella. */
  readonly cuenta: CuentaCruce | null;
  readonly naturaleza: NaturalezaCruce;
}

/**
 * En un **recaudo** (CxC) una factura (operación `1`) se abona con **crédito** y
 * una nota crédito (operación `-1`) descuenta con **débito**; en un pago a
 * proveedor (CxP) es el espejo.
 *
 * Un tipo sin operación declarada cae al caso normal (`1`), el de la factura.
 */
function naturalezaDeCruce(operacion: number | null, carteraTipo: CarteraTipo): NaturalezaCruce {
  if (carteraTipo === 'cobrar') return operacion === -1 ? 'D' : 'C';
  return operacion === -1 ? 'C' : 'D';
}

/**
 * Cuenta de cruce: la define el **tipo** de documento (la de CxC o la de CxP
 * según la familia). Si el tipo no la trae, la línea nace sin cuenta y la elige
 * el usuario.
 *
 * No se cae a la `cuenta` del propio documento —el parche del ERP anterior para
 * seguridad social—: ese campo viene poblado también en documentos ordinarios,
 * así que como fallback imputaría una cuenta errónea en todo el cruce.
 */
function cuentaDeCruce(doc: DocumentoPendienteApi, carteraTipo: CarteraTipo): CuentaCruce | null {
  const esCobrar = carteraTipo === 'cobrar';
  const id = esCobrar ? doc.documento_tipo_cuenta_cobrar_id : doc.documento_tipo_cuenta_pagar_id;
  if (id == null) return null;
  return {
    id,
    codigo:
      (esCobrar
        ? doc.documento_tipo_cuenta_cobrar_codigo
        : doc.documento_tipo_cuenta_pagar_codigo) ?? '',
    nombre:
      (esCobrar
        ? doc.documento_tipo_cuenta_cobrar_nombre
        : doc.documento_tipo_cuenta_pagar_nombre) ?? '',
  };
}

/**
 * Resuelve con qué cuenta y con qué naturaleza entra un documento pendiente como
 * línea del documento que lo cruza. Punto único de cambio si el backend mueve
 * esos campos (ver `agregar-documento.types.ts`).
 */
export function resolverCruce(doc: DocumentoPendienteApi, carteraTipo: CarteraTipo): CruceResuelto {
  return {
    cuenta: cuentaDeCruce(doc, carteraTipo),
    naturaleza: naturalezaDeCruce(doc.documento_tipo_operacion, carteraTipo),
  };
}
