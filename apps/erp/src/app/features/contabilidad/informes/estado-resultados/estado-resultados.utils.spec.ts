import type { InformeEstadoRow } from '../../shared/movimiento-informe.types';
import { formatPorcentaje, totalesDeBase } from './estado-resultados.utils';

const fila = (saldo: string): InformeEstadoRow => ({
  tipo: 'AUXILIAR',
  cuenta_id: 1,
  codigo: '4135',
  nombre: 'Comercio',
  clase: 'Ingresos',
  grupo: 'Operacionales',
  saldo,
});

describe('totalesDeBase', () => {
  it('suma el saldo de todas las filas con los 6 decimales del backend', () => {
    expect(totalesDeBase([fila('0.100000'), fila('0.200000'), fila('-0.050000')])).toEqual({
      saldo: '0.250000',
    });
  });

  it('da cero sin filas', () => {
    expect(totalesDeBase([])).toEqual({ saldo: '0.000000' });
  });
});

describe('formatPorcentaje', () => {
  it('convierte la fracción en porcentaje', () => {
    expect(formatPorcentaje('0.25', 'en-US')).toBe('25%');
  });

  it('respeta los negativos y hasta dos decimales', () => {
    expect(formatPorcentaje('-0.12345', 'en-US')).toBe('-12.35%');
  });

  it('queda vacío cuando el año anterior estaba en cero', () => {
    expect(formatPorcentaje(null)).toBe('');
  });
});
