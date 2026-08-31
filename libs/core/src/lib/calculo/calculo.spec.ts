import { calcularImpuestosLinea, calcularResumen, redondearMoneda } from './calculo';
import type { LineaCalculo, TasaImpuesto } from './calculo.types';

const IVA_19: TasaImpuesto = { id: 1, nombre: 'IVA 19%', porcentaje: 19, porcentajeBase: 100 };
const IVA_AIU: TasaImpuesto = { id: 2, nombre: 'IVA AIU', porcentaje: 19, porcentajeBase: 10 };
const RETE: TasaImpuesto = { id: 3, nombre: 'ReteFuente', porcentaje: 2.5, porcentajeBase: 100 };
const RETE_OPERADA: TasaImpuesto = {
  id: 3,
  nombre: 'ReteFuente',
  porcentaje: 2.5,
  porcentajeBase: 100,
  operacion: -1,
};

describe('redondearMoneda', () => {
  it('redondea a entero (COP sin decimales)', () => {
    expect(redondearMoneda(100.4)).toBe(100);
    expect(redondearMoneda(100.5)).toBe(101);
    expect(redondearMoneda(100)).toBe(100);
  });
});

describe('calcularImpuestosLinea', () => {
  it('aplica porcentaje sobre base completa: 1.000.000 × 19% = 190.000', () => {
    expect(calcularImpuestosLinea(1_000_000, [IVA_19])).toEqual([
      { id: 1, nombre: 'IVA 19%', total: 190_000 },
    ]);
  });

  it('aplica el porcentaje de base parcial (AIU 10%): 1.000.000 × 19% × 10% = 19.000', () => {
    expect(calcularImpuestosLinea(1_000_000, [IVA_AIU])).toEqual([
      { id: 2, nombre: 'IVA AIU', total: 19_000 },
    ]);
  });

  it('redondea cada monto a entero (front autoritativo, sin colas decimales)', () => {
    // 333.333 × 2.5% = 8.333,325 → 8.333
    expect(calcularImpuestosLinea(333_333, [RETE])).toEqual([
      { id: 3, nombre: 'ReteFuente', total: 8_333 },
    ]);
  });

  it('resuelve varias tasas de una línea', () => {
    const r = calcularImpuestosLinea(1_000_000, [IVA_19, RETE]);
    expect(r).toEqual([
      { id: 1, nombre: 'IVA 19%', total: 190_000 },
      { id: 3, nombre: 'ReteFuente', total: 25_000 },
    ]);
  });

  it('sin tasas devuelve lista vacía', () => {
    expect(calcularImpuestosLinea(1_000_000, [])).toEqual([]);
  });

  it('una retención (operacion −1) produce monto negativo: 1.000.000 × 2.5% × −1 = −25.000', () => {
    expect(calcularImpuestosLinea(1_000_000, [RETE_OPERADA])).toEqual([
      { id: 3, nombre: 'ReteFuente', total: -25_000 },
    ]);
  });

  it('sin operacion declarada asume 1 (suma), compatible con tasas existentes', () => {
    expect(calcularImpuestosLinea(1_000_000, [RETE])).toEqual([
      { id: 3, nombre: 'ReteFuente', total: 25_000 },
    ]);
  });

  it('IVA y retención conviven en la línea con sus signos', () => {
    expect(calcularImpuestosLinea(1_000_000, [IVA_19, RETE_OPERADA])).toEqual([
      { id: 1, nombre: 'IVA 19%', total: 190_000 },
      { id: 3, nombre: 'ReteFuente', total: -25_000 },
    ]);
  });

  it('porcentaje 0 produce monto 0', () => {
    expect(calcularImpuestosLinea(1_000_000, [{ ...IVA_19, porcentaje: 0 }])).toEqual([
      { id: 1, nombre: 'IVA 19%', total: 0 },
    ]);
  });
});

describe('calcularResumen', () => {
  it('documento vacío ⇒ todo en cero', () => {
    expect(calcularResumen([])).toEqual({ subtotal: 0, descuento: 0, impuestos: [], total: 0 });
  });

  it('una línea: total = base + impuesto', () => {
    const lineas: LineaCalculo[] = [
      { base: 1_000_000, impuestos: [{ id: 1, nombre: 'IVA 19%', total: 190_000 }] },
    ];
    expect(calcularResumen(lineas)).toEqual({
      subtotal: 1_000_000,
      descuento: 0,
      impuestos: [{ id: 1, nombre: 'IVA 19%', total: 190_000 }],
      total: 1_190_000,
    });
  });

  it('agrupa el mismo impuesto repartido en varias líneas en un solo renglón', () => {
    const lineas: LineaCalculo[] = [
      { base: 1_000_000, impuestos: [{ id: 1, nombre: 'IVA 19%', total: 190_000 }] },
      { base: 500_000, impuestos: [{ id: 1, nombre: 'IVA 19%', total: 95_000 }] },
      { base: 200_000, impuestos: [{ id: 1, nombre: 'IVA 19%', total: 38_000 }] },
    ];
    const r = calcularResumen(lineas);
    expect(r.subtotal).toBe(1_700_000);
    expect(r.impuestos).toEqual([{ id: 1, nombre: 'IVA 19%', total: 323_000 }]);
    expect(r.total).toBe(2_023_000);
  });

  it('mantiene impuestos distintos separados', () => {
    const lineas: LineaCalculo[] = [
      {
        base: 1_000_000,
        impuestos: [
          { id: 1, nombre: 'IVA 19%', total: 190_000 },
          { id: 3, nombre: 'ReteFuente', total: 25_000 },
        ],
      },
    ];
    const r = calcularResumen(lineas);
    expect(r.impuestos).toEqual([
      { id: 1, nombre: 'IVA 19%', total: 190_000 },
      { id: 3, nombre: 'ReteFuente', total: 25_000 },
    ]);
    expect(r.total).toBe(1_215_000);
  });

  it('las retenciones (montos negativos) restan del total y se ven negativas en el desglose', () => {
    // 1.000.000 + IVA 190.000 − ReteFuente 25.000 = 1.165.000
    const lineas: LineaCalculo[] = [
      {
        base: 1_000_000,
        impuestos: [
          { id: 1, nombre: 'IVA 19%', total: 190_000 },
          { id: 3, nombre: 'ReteFuente', total: -25_000 },
        ],
      },
    ];
    const r = calcularResumen(lineas);
    expect(r.impuestos).toEqual([
      { id: 1, nombre: 'IVA 19%', total: 190_000 },
      { id: 3, nombre: 'ReteFuente', total: -25_000 },
    ]);
    expect(r.total).toBe(1_165_000);
  });

  it('resta el descuento del total', () => {
    const lineas: LineaCalculo[] = [
      {
        base: 1_000_000,
        descuento: 100_000,
        impuestos: [{ id: 1, nombre: 'IVA 19%', total: 190_000 }],
      },
    ];
    const r = calcularResumen(lineas);
    expect(r.subtotal).toBe(1_000_000);
    expect(r.descuento).toBe(100_000);
    // total = 1.000.000 − 100.000 + 190.000
    expect(r.total).toBe(1_090_000);
  });

  it('líneas sin impuestos: total = subtotal', () => {
    const lineas: LineaCalculo[] = [
      { base: 1_000_000, impuestos: [] },
      { base: 250_000, impuestos: [] },
    ];
    const r = calcularResumen(lineas);
    expect(r.subtotal).toBe(1_250_000);
    expect(r.impuestos).toEqual([]);
    expect(r.total).toBe(1_250_000);
  });
});
