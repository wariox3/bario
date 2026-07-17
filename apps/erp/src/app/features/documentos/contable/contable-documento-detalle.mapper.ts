import { redondearMoneda, toFiniteNumber } from '@reddoc/core';
import type { CuentaDetalleRead, CuentaDetallePayload } from './contable-documento-detalle.model';
import type {
  CuentaDetalleFormRawValue,
  NaturalezaCuenta,
  ResumenContable,
} from './contable-documento-detalle.types';

/** Normaliza la naturaleza cruda del backend a `'D'`/`'C'` (default `'D'`). */
function toNaturaleza(value: string | null | undefined): NaturalezaCuenta {
  return value === 'C' ? 'C' : 'D';
}

/** Read-model (GET) → valores de formulario de una línea de cuenta. */
export function cuentaDetalleToFormValue(read: CuentaDetalleRead): CuentaDetalleFormRawValue {
  const label = [read.cuenta_codigo, read.cuenta_nombre].filter(Boolean).join(' - ');
  return {
    id: read.id ?? null,
    cuenta:
      read.cuenta != null ? { id: read.cuenta, nombre: label || read.cuenta_nombre || '' } : null,
    naturaleza: toNaturaleza(read.naturaleza),
    valor: toFiniteNumber(read.precio) ?? 0,
    contacto:
      read.contacto != null
        ? { id: read.contacto, nombre: read.contacto_nombre_corto ?? '' }
        : null,
    centro_costo:
      read.centro_costo != null
        ? { id: read.centro_costo, nombre: read.centro_costo_nombre ?? '' }
        : null,
    base: toFiniteNumber(read.base) ?? 0,
  };
}

/** Valores del formulario → payload de una línea de cuenta (POST/PATCH). */
export function cuentaDetalleToPayload(raw: CuentaDetalleFormRawValue): CuentaDetallePayload {
  const valor = (raw.valor ?? 0).toFixed(2);
  return {
    tipo_registro: 'C',
    item: null,
    cuenta: raw.cuenta?.id ?? null,
    naturaleza: raw.naturaleza,
    precio: valor,
    total: valor,
    contacto: raw.contacto?.id ?? null,
    centro_costo: raw.centro_costo?.id ?? null,
    base: (raw.base ?? 0).toFixed(2),
  };
}

/**
 * Acumula débitos y créditos de las líneas de cuenta: suma el `valor` de cada
 * línea en el bucket de su naturaleza, y neto = créditos − débitos. Redondeo de
 * moneda una sola vez, al final: acumular ya redondeado arrastra el error.
 */
export function calcularResumenContable(
  lines: readonly CuentaDetalleFormRawValue[],
): ResumenContable {
  let debitos = 0;
  let creditos = 0;
  for (const line of lines) {
    const valor = line.valor ?? 0;
    if (line.naturaleza === 'C') creditos += valor;
    else debitos += valor;
  }
  return {
    debitos: redondearMoneda(debitos),
    creditos: redondearMoneda(creditos),
    total: redondearMoneda(creditos - debitos),
  };
}
