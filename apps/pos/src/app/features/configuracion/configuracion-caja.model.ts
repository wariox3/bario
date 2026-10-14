import { DOCUMENT_TYPE_ID, type ErpSelectOption } from '@reddoc/core';

/** Tipos de documento con los que puede facturar una caja. */
export const POS_DOCUMENTO_TIPOS = [
  DOCUMENT_TYPE_ID.FACTURA_POS,
  DOCUMENT_TYPE_ID.FACTURA_POS_ELECTRONICO,
] as const;

export type PosDocumentoTipoId = (typeof POS_DOCUMENTO_TIPOS)[number];

/**
 * Configuración de **esta caja** (dispositivo) dentro del tenant.
 *
 * No hay campos `pos_*` en la configuración del backend: cada caja física
 * guarda la suya en el navegador (ver `docs/architecture/pos-migracion.md`, §8).
 * Los selects guardan la opción completa para pintarse sin volver a consultar.
 */
export interface ConfiguracionCaja {
  /** Factura POS (27) o factura POS electrónica (24). */
  readonly documentoTipoId: PosDocumentoTipoId | null;
  /** Almacén del que sale la mercancía; lo heredan las líneas. */
  readonly almacen: ErpSelectOption | null;
  /** Cuenta bancaria donde entra el efectivo de los cobros. */
  readonly cuentaEfectivo: ErpSelectOption | null;
  readonly sede: ErpSelectOption | null;
  /** Asesor que se propone en cada venta; se puede cambiar al cobrar. */
  readonly asesor: ErpSelectOption | null;
}

export const CONFIGURACION_CAJA_VACIA: ConfiguracionCaja = {
  documentoTipoId: null,
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

/** Valida lo leído del almacenamiento local antes de usarlo. */
export function esConfiguracionCaja(valor: unknown): valor is ConfiguracionCaja {
  if (valor === null || typeof valor !== 'object') return false;
  const config = valor as Record<string, unknown>;
  const tipo = config['documentoTipoId'];
  const tipoValido = tipo === null || POS_DOCUMENTO_TIPOS.some((permitido) => permitido === tipo);
  return (
    tipoValido &&
    esOpcionONulo(config['almacen']) &&
    esOpcionONulo(config['cuentaEfectivo']) &&
    esOpcionONulo(config['sede']) &&
    esOpcionONulo(config['asesor'])
  );
}
