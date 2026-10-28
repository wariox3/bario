import type { CuentaDetalleFormRawValue } from '@erp/features/documentos/contable/contable-documento-detalle.types';
import { calcularResumenContable } from '@erp/features/documentos/contable/contable-documento-detalle.mapper';
import { formValueToPayload } from './asiento.mapper';
import type { AsientoFormRawValue } from './asiento-form.types';

const ASIENTO_TIPO = 31;

function linea(naturaleza: 'D' | 'C', valor: number | null): CuentaDetalleFormRawValue {
  return {
    id: null,
    cuenta: { id: 7, nombre: '1105 - Caja' },
    naturaleza,
    valor,
    contacto: null,
    centro_costo: null,
    base: 0,
    numero: null,
    detalle: null,
    documento_afectado: null,
    documento_afectado_numero: null,
    documento_afectado_tipo: null,
  };
}

function asiento(detalles: readonly CuentaDetalleFormRawValue[]): AsientoFormRawValue {
  return {
    contacto: { id: 5, nombre: 'Tercero' },
    fecha: new Date(2026, 9, 26),
    soporte: 'S-1',
    comprobante: { id: 2, nombre: 'Diario' },
    centro_costo: null,
    comentario: null,
    detalles,
  };
}

describe('calcularResumenContable', () => {
  it('acumula cada línea en el lado de su naturaleza', () => {
    const resumen = calcularResumenContable([linea('D', 1000), linea('D', 500), linea('C', 1200)]);

    expect(resumen.debitos).toBe(1500);
    expect(resumen.creditos).toBe(1200);
  });

  it('en cartera por cobrar el neto es créditos − débitos', () => {
    expect(calcularResumenContable([linea('D', 300), linea('C', 1000)]).total).toBe(700);
  });

  it('en cartera por pagar el neto es el espejo: débitos − créditos', () => {
    expect(calcularResumenContable([linea('D', 300), linea('C', 1000)], 'pagar').total).toBe(-700);
  });

  it('redondea una sola vez al final, no línea por línea', () => {
    // 3 × 0,004 = 0,012 → 0,01. Redondeando cada línea daría 0.
    const resumen = calcularResumenContable([
      linea('D', 0.004),
      linea('D', 0.004),
      linea('D', 0.004),
    ]);

    expect(resumen.debitos).toBe(0.01);
  });

  it('una línea sin valor cuenta como 0', () => {
    expect(calcularResumenContable([linea('D', null), linea('C', 100)]).total).toBe(100);
  });

  it('sin líneas todo queda en 0', () => {
    expect(calcularResumenContable([])).toEqual({ debitos: 0, creditos: 0, total: 0 });
  });
});

describe('formValueToPayload (asiento)', () => {
  it('un asiento cuadrado manda total "0.00"', () => {
    const payload = formValueToPayload(
      asiento([linea('D', 1_190_000), linea('C', 1_000_000), linea('C', 190_000)]),
      ASIENTO_TIPO,
    );

    expect(payload.total).toBe('0.00');
  });

  it('cuadrado con decimales que en coma flotante no restan exacto: "0.00", no "-0.00"', () => {
    // 0,3 − (0,1 + 0,2) da −5,55e-17 en JavaScript: sin redondear, toFixed da "-0.00".
    const payload = formValueToPayload(
      asiento([linea('D', 0.1), linea('D', 0.2), linea('C', 0.3)]),
      ASIENTO_TIPO,
    );

    expect(payload.total).toBe('0.00');
  });

  it('un asiento descuadrado manda la diferencia (créditos − débitos)', () => {
    const payload = formValueToPayload(asiento([linea('D', 1000), linea('C', 900)]), ASIENTO_TIPO);

    expect(payload.total).toBe('-100.00');
  });

  it('en alta las líneas viajan embebidas como registros de cuenta', () => {
    const payload = formValueToPayload(asiento([linea('D', 50.5), linea('C', 50.5)]), ASIENTO_TIPO);

    expect(payload.detalles).toHaveLength(2);
    expect(payload.detalles?.[0]).toMatchObject({
      tipo_registro: 'C',
      item: null,
      naturaleza: 'D',
      precio: '50.50',
      total: '50.50',
    });
  });

  it('en edición no manda detalles: transaccionan aparte', () => {
    const payload = formValueToPayload(
      asiento([linea('D', 10), linea('C', 10)]),
      ASIENTO_TIPO,
      false,
    );

    expect(payload).not.toHaveProperty('detalles');
    expect(payload.total).toBe('0.00');
  });

  it('cabecera: tipo, ids de las opciones y fecha ISO', () => {
    const payload = formValueToPayload(asiento([]), ASIENTO_TIPO);

    expect(payload).toMatchObject({
      documento_tipo: ASIENTO_TIPO,
      contacto: 5,
      comprobante: 2,
      centro_costo: null,
      fecha: '2026-10-26',
      soporte: 'S-1',
    });
  });
});
