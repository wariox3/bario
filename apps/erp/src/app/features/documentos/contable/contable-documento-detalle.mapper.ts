import { redondearMoneda, toFiniteNumber } from '@reddoc/core';
import { resolverCruce } from '@erp/core/module-config';
import type { CarteraTipo, DocumentoPendienteApi } from '@erp/core/module-config';
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
    numero: toFiniteNumber(read.numero) ?? null,
    detalle: read.detalle ?? null,
    documento_afectado: read.documento_afectado ?? null,
    documento_afectado_numero:
      read.documento_afectado_numero != null ? String(read.documento_afectado_numero) : null,
    documento_afectado_tipo: read.documento_afectado_documento_tipo_nombre ?? null,
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
    numero: raw.numero,
    detalle: raw.detalle,
    documento_afectado: raw.documento_afectado,
  };
}

/**
 * Documento pendiente (fila del modal "agregar documento") → valores de una
 * línea contable **enlazada**: `documento_afectado` apunta al documento
 * cruzado, `valor` nace en su `pendiente` (editable: abonos parciales) y la
 * cuenta/naturaleza las fija el cruce (el form las deshabilita).
 *
 * Qué cuenta y qué naturaleza le tocan lo decide `resolverCruce`
 * (`cruce.rules.ts`); acá solo se traduce a los campos del `FormGroup`. La
 * cuenta se arma con la misma etiqueta `código - nombre` que produce
 * `<app-cuenta-select>`, para que una sembrada por el cruce y una elegida a mano
 * se vean igual en el control.
 */
export function documentoPendienteToFormValue(
  doc: DocumentoPendienteApi,
  carteraTipo: CarteraTipo,
): CuentaDetalleFormRawValue {
  const { cuenta, naturaleza } = resolverCruce(doc, carteraTipo);
  return {
    id: null,
    cuenta: cuenta
      ? {
          id: cuenta.id,
          nombre: [cuenta.codigo, cuenta.nombre].filter(Boolean).join(' - '),
          codigo: cuenta.codigo,
        }
      : null,
    naturaleza,
    valor: toFiniteNumber(doc.pendiente) ?? 0,
    contacto:
      doc.contacto != null ? { id: doc.contacto, nombre: doc.contacto_nombre_corto ?? '' } : null,
    centro_costo: null,
    base: 0,
    // El cruce de cartera no imputa número ni glosa: los pone el usuario en un
    // asiento manual, no un documento afectado.
    numero: null,
    detalle: null,
    documento_afectado: doc.id,
    documento_afectado_numero: doc.numero != null ? String(doc.numero) : null,
    documento_afectado_tipo: doc.documento_tipo_nombre,
  };
}

/**
 * Acumula débitos y créditos de las líneas de cuenta: suma el `valor` de cada
 * línea en el bucket de su naturaleza. Redondeo de moneda una sola vez, al
 * final: acumular ya redondeado arrastra el error.
 *
 * El signo del **neto** depende de la familia de cartera del documento: en un
 * recaudo (CxC) el neto es `créditos − débitos`; en un desembolso (CxP, el
 * egreso) es el espejo, `débitos − créditos`. Reglas tomadas del legacy
 * (pago/egreso).
 */
export function calcularResumenContable(
  lines: readonly CuentaDetalleFormRawValue[],
  carteraTipo: CarteraTipo = 'cobrar',
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
    total: redondearMoneda(carteraTipo === 'cobrar' ? creditos - debitos : debitos - creditos),
  };
}
