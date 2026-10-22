import { aplicarDeltas, calcularImpuestosLinea, calcularResumen, redondearMoneda } from './calculo';
import type { LineaCalculo, ResumenDocumento, TasaImpuesto } from './calculo.types';

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
  it('redondea a centavos (2 decimales, como el backend)', () => {
    expect(redondearMoneda(5.985)).toBe(5.99);
    expect(redondearMoneda(100.004)).toBe(100);
    expect(redondearMoneda(100)).toBe(100);
  });

  it('no se deja engañar por la representación binaria de la mitad', () => {
    // 1.005 × 100 = 100.49999999999999 en coma flotante
    expect(redondearMoneda(1.005)).toBe(1.01);
  });

  it('redondea negativos (retenciones) igual que su positivo', () => {
    expect(redondearMoneda(-5.985)).toBe(-5.99);
    expect(redondearMoneda(-0.004)).toBe(0);
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

  it('redondea cada monto a centavos: 31,50 × 19% = 5,985 → 5,99', () => {
    expect(calcularImpuestosLinea(31.5, [IVA_19])).toEqual([
      { id: 1, nombre: 'IVA 19%', total: 5.99 },
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

  it('suma montos con centavos sin colas de coma flotante', () => {
    const lineas: LineaCalculo[] = [
      { base: 0.1, impuestos: [{ id: 1, nombre: 'IVA 19%', total: 0.1 }] },
      { base: 0.2, impuestos: [{ id: 1, nombre: 'IVA 19%', total: 0.2 }] },
    ];
    const r = calcularResumen(lineas);
    expect(r.subtotal).toBe(0.3);
    expect(r.impuestos).toEqual([{ id: 1, nombre: 'IVA 19%', total: 0.3 }]);
    expect(r.total).toBe(0.6);
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

describe('aplicarDeltas', () => {
  const iva = (total: number) => ({ id: 3, nombre: 'IVA 19%', total });
  const linea = (base: number, ivaTotal: number): LineaCalculo => ({
    base,
    impuestos: [iva(ivaTotal)],
  });
  // Lo que devolvió el backend para un documento con más líneas que las cargadas.
  const base: ResumenDocumento = {
    subtotal: 1000,
    descuento: 0,
    impuestos: [{ id: 3, nombre: 'IVA Compras 19%', total: 190 }],
    total: 1190,
  };

  it('sin cambios devuelve la base tal cual', () => {
    const cargadas = [linea(100, 19), linea(200, 38)];
    expect(aplicarDeltas(base, cargadas, cargadas)).toEqual(base);
  });

  it('una línea editada suma solo la diferencia', () => {
    const r = aplicarDeltas(base, [linea(150, 28.5)], [linea(100, 19)]);
    expect(r.subtotal).toBe(1050);
    expect(r.impuestos).toEqual([{ id: 3, nombre: 'IVA Compras 19%', total: 199.5 }]);
    expect(r.total).toBe(1249.5);
  });

  it('una nueva suma y una quitada resta', () => {
    const nueva: LineaCalculo = {
      base: 50,
      descuento: 5,
      impuestos: [{ id: 4, nombre: 'IVA 5%', total: 2.25 }],
    };
    const r = aplicarDeltas(base, [nueva], [linea(100, 19)]);
    expect(r.subtotal).toBe(950);
    expect(r.descuento).toBe(5);
    expect(r.impuestos).toEqual([
      { id: 3, nombre: 'IVA Compras 19%', total: 171 },
      { id: 4, nombre: 'IVA 5%', total: 2.25 },
    ]);
    expect(r.total).toBe(1118.25);
  });

  it('omite el impuesto que quedó en cero al quitar sus líneas', () => {
    const r = aplicarDeltas(base, [], [linea(1000, 190)]);
    expect(r.impuestos).toEqual([]);
    expect(r.total).toBe(0);
  });

  it('conserva un impuesto en cero que viene de la base sin tocar', () => {
    const exento: ResumenDocumento = {
      ...base,
      impuestos: [...base.impuestos, { id: 9, nombre: 'IVA 0%', total: 0 }],
    };
    const r = aplicarDeltas(exento, [linea(100, 19)], [linea(100, 19)]);
    expect(r.impuestos.map((imp) => imp.id)).toEqual([3, 9]);
  });

  it('no arrastra colas de coma flotante', () => {
    const r = aplicarDeltas(
      { subtotal: 0.3, descuento: 0, impuestos: [], total: 0.3 },
      [{ base: 0.1, impuestos: [] }],
      [{ base: 0.2, impuestos: [] }],
    );
    expect(r.subtotal).toBe(0.2);
  });
});
