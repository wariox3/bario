import type { LineaNominaDelContrato, NominaDelContrato } from './nominas-contrato.model';
import { conDocumento, sumar, totalesDe } from './nominas-contrato.totales';

interface Fila {
  devengado: number | string | null;
  deduccion: number | string | null;
}

const FILAS: Fila[] = [
  { devengado: 1000, deduccion: 100 },
  { devengado: '2500.50', deduccion: null },
  { devengado: null, deduccion: 50 },
];

describe('sumar', () => {
  it('sin filas suma cero', () => {
    expect(sumar([], 'devengado' as never)).toBe(0);
  });

  it('suma números y strings decimales por igual', () => {
    expect(sumar(FILAS, 'devengado')).toBe(3500.5);
  });

  it('cuenta como cero lo nulo o no numérico', () => {
    // Un solo valor basura no puede convertir el total en NaN.
    expect(sumar(FILAS, 'deduccion')).toBe(150);
    expect(sumar([{ devengado: 'x', deduccion: 10 }], 'devengado')).toBe(0);
  });
});

describe('totalesDe', () => {
  it('devuelve un total por cada campo pedido', () => {
    expect(totalesDe(FILAS, ['devengado', 'deduccion'])).toEqual({
      devengado: 3500.5,
      deduccion: 150,
    });
  });

  it('sin campos devuelve el mapa vacío', () => {
    expect(totalesDe(FILAS, [])).toEqual({});
  });
});

describe('conDocumento', () => {
  const nomina = (id: number, numero: number, tipo: string): NominaDelContrato => ({
    id,
    documento_tipo_nombre: tipo,
    numero,
    fecha_desde: null,
    fecha_hasta: null,
    salario: null,
    base_cotizacion: null,
    base_prestacion: null,
    devengado: null,
    deduccion: null,
    total: null,
  });
  const linea = (id: number, documento: number | null): LineaNominaDelContrato => ({
    id,
    documento,
    concepto_id: null,
    concepto_nombre: null,
    detalle: null,
    porcentaje: null,
    cantidad: null,
    dias: null,
    hora: null,
    devengado: null,
    deduccion: null,
    base_cotizacion: null,
    base_prestacion: null,
  });

  it('le pone a cada línea el tipo y el número de su nómina', () => {
    const [resultado] = conDocumento([linea(1, 10)], [nomina(10, 25, 'Nómina')]);
    expect(resultado.documento_tipo_nombre).toBe('Nómina');
    expect(resultado.documento_numero).toBe(25);
  });

  it('deja en null la línea cuya nómina no vino', () => {
    const [sinNomina, sinDocumento] = conDocumento([linea(1, 99), linea(2, null)], []);
    expect(sinNomina.documento_numero).toBeNull();
    expect(sinDocumento.documento_tipo_nombre).toBeNull();
  });
});
