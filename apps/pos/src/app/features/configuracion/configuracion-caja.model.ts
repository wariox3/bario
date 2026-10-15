import { DOCUMENT_TYPE_ID, type ErpSelectOption } from '@reddoc/core';

/** Tipos de documento con los que puede facturar una caja. */
export const POS_DOCUMENTO_TIPOS = [
  DOCUMENT_TYPE_ID.FACTURA_POS,
  DOCUMENT_TYPE_ID.FACTURA_POS_ELECTRONICO,
] as const;

export type PosDocumentoTipoId = (typeof POS_DOCUMENTO_TIPOS)[number];

/**
 * Configuración con la que vende una caja. Tiene dos dueños:
 *
 * - **La empresa:** el tipo de documento, en el backend
 *   (`GenConfiguracion.ven_pos_documento_tipo`). Es una decisión fiscal: todas
 *   las cajas facturan con el mismo.
 * - **La caja física:** almacén, cuenta, sede y asesor, en el navegador
 *   (`ConfiguracionLocal`). Cada caja puede tener los suyos.
 *
 * Los selects guardan la opción completa para pintarse sin volver a consultar.
 */
export interface ConfiguracionCaja extends ConfiguracionLocal {
  /** Factura POS (27) o factura POS electrónica (24). */
  readonly documentoTipoId: PosDocumentoTipoId | null;
}

/** Lo que cada caja guarda en su navegador. */
export interface ConfiguracionLocal {
  /** Almacén del que sale la mercancía; lo heredan las líneas. */
  readonly almacen: ErpSelectOption | null;
  /** Cuenta bancaria donde entra el efectivo de los cobros. */
  readonly cuentaEfectivo: ErpSelectOption | null;
  readonly sede: ErpSelectOption | null;
  /** Asesor que se propone en cada venta; se puede cambiar al cobrar. */
  readonly asesor: ErpSelectOption | null;
}

export const CONFIGURACION_LOCAL_VACIA: ConfiguracionLocal = {
  almacen: null,
  cuentaEfectivo: null,
  sede: null,
  asesor: null,
};

/**
 * Sin tipo de documento, almacén y cuenta de efectivo la caja no puede vender:
 * son los tres datos que el documento y su pago no pueden inventar. Sede y
 * asesor son opcionales.
 */
export function configuracionCompleta(config: ConfiguracionCaja): boolean {
  return (
    config.documentoTipoId !== null && config.almacen !== null && config.cuentaEfectivo !== null
  );
}

function esOpcionONulo(valor: unknown): valor is ErpSelectOption | null {
  if (valor === null) return true;
  if (typeof valor !== 'object') return false;
  const opcion = valor as Record<string, unknown>;
  return typeof opcion['id'] === 'number' && typeof opcion['nombre'] === 'string';
}

/**
 * Valida lo leído del almacenamiento local antes de usarlo. Lo guardado antes de
 * que el tipo de documento pasara al backend trae además `documentoTipoId`: se
 * acepta y se ignora (ver `soloLocal`), para no perder almacén y cuenta.
 */
export function esConfiguracionLocal(valor: unknown): valor is ConfiguracionLocal {
  if (valor === null || typeof valor !== 'object') return false;
  const config = valor as Record<string, unknown>;
  return (
    esOpcionONulo(config['almacen']) &&
    esOpcionONulo(config['cuentaEfectivo']) &&
    esOpcionONulo(config['sede']) &&
    esOpcionONulo(config['asesor'])
  );
}

/** Lo local, sin campos de más que pudiera traer lo guardado. */
export function soloLocal(config: ConfiguracionLocal): ConfiguracionLocal {
  return {
    almacen: config.almacen,
    cuentaEfectivo: config.cuentaEfectivo,
    sede: config.sede,
    asesor: config.asesor,
  };
}
