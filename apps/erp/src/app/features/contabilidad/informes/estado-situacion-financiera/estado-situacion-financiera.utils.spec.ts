import { formatCop } from '@reddoc/core';
import type {
  SituacionFormalFila,
  SituacionFormalFilaTipo,
} from './estado-situacion-financiera.types';
import {
  diferencia,
  direccionDe,
  filasVisibles,
  formatMillones,
  formatMontoContable,
  formatRazon,
  inicioDelAnio,
} from './estado-situacion-financiera.utils';

const f = (tipo: SituacionFormalFilaTipo, nombre: string, actual: string | null = null) =>
  ({
    tipo,
    codigo: '',
    nombre,
    actual,
    anterior: null,
    variacion: null,
    porcentaje: null,
  }) satisfies SituacionFormalFila;

/** Activo con dos subsecciones, patrimonio sin subsecciones y el total final. */
const FILAS: readonly SituacionFormalFila[] = [
  f('SECCION', 'Activo'), // 0
  f('SUBSECCION', 'Activo corriente'), // 1
  f('LINEA', 'Caja', '10'), // 2
  f('SUBTOTAL', 'Total activo corriente', '10'), // 3
  f('SUBSECCION', 'Activo no corriente'), // 4
  f('LINEA', 'Equipo', '20'), // 5
  f('SUBTOTAL', 'Total activo no corriente', '20'), // 6
  f('TOTAL', 'Total activo', '30'), // 7
  f('SECCION', 'Patrimonio'), // 8
  f('LINEA', 'Capital', '25'), // 9
  f('RESULTADO', 'Resultado del ejercicio', '5'), // 10
  f('TOTAL', 'Total patrimonio', '30'), // 11
  f('TOTAL_FINAL', 'Total pasivo y patrimonio', '30'), // 12
];

const nombres = (plegadas: number[]) =>
  filasVisibles(FILAS, new Set(plegadas)).map((vm) => vm.fila.nombre);

describe('filasVisibles', () => {
  it('sin nada plegado pinta todas las filas', () => {
    expect(nombres([])).toHaveLength(FILAS.length);
  });

  it('solo las secciones y subsecciones se pliegan, y abiertas no pintan importes', () => {
    const vms = filasVisibles(FILAS, new Set());
    expect(vms.filter((vm) => vm.plegable).map((vm) => vm.indice)).toEqual([0, 1, 4, 8]);
    expect(vms.find((vm) => vm.indice === 1)?.importes).toBeNull();
  });

  it('una subsección plegada oculta sus líneas y su subtotal, y pinta sus importes', () => {
    expect(nombres([1])).not.toContain('Caja');
    expect(nombres([1])).not.toContain('Total activo corriente');
    expect(nombres([1])).toContain('Equipo');
    const cabecera = filasVisibles(FILAS, new Set([1])).find((vm) => vm.indice === 1);
    expect(cabecera?.plegada).toBe(true);
    expect(cabecera?.importes?.actual).toBe('10');
  });

  it('una sección plegada oculta todo menos su total', () => {
    expect(nombres([0])).toEqual([
      'Activo',
      'Total activo',
      'Patrimonio',
      'Capital',
      'Resultado del ejercicio',
      'Total patrimonio',
      'Total pasivo y patrimonio',
    ]);
  });

  it('una sección sin subsecciones se pliega igual', () => {
    expect(nombres([8])).not.toContain('Capital');
    expect(nombres([8])).toContain('Total patrimonio');
    expect(nombres([8])).toContain('Total pasivo y patrimonio');
  });
});

describe('formatMontoContable', () => {
  it('pone los negativos entre paréntesis y sin signo', () => {
    expect(formatMontoContable('-1500.000000')).toBe(`(${formatCop(1500)})`);
  });

  it('deja los positivos como importe normal', () => {
    expect(formatMontoContable('1500')).toBe(formatCop(1500));
  });

  it('queda vacío sin importe', () => {
    expect(formatMontoContable(null)).toBe('');
  });
});

describe('formatMillones', () => {
  it('resume en millones con un decimal', () => {
    expect(formatMillones('830420300.000000', 'en-US')).toBe('$ 830.4 M');
  });

  it('marca los negativos con el signo menos tipográfico', () => {
    expect(formatMillones(-2_500_000, 'en-US')).toBe('−$ 2.5 M');
  });

  it('queda vacío sin dato', () => {
    expect(formatMillones(null)).toBe('');
  });
});

describe('formatRazon', () => {
  it('pinta dos decimales', () => {
    expect(formatRazon('1.6234', 'en-US')).toBe('1.62');
  });

  it('queda vacía cuando el backend la manda nula', () => {
    expect(formatRazon(null)).toBe('');
  });
});

describe('direccionDe', () => {
  it('distingue subida, bajada y sin cambio', () => {
    expect(direccionDe('5')).toBe('sube');
    expect(direccionDe('-5')).toBe('baja');
    expect(direccionDe('0.000000')).toBeNull();
    expect(direccionDe(null)).toBeNull();
  });
});

describe('diferencia', () => {
  it('resta los dos cortes con los 6 decimales del backend', () => {
    expect(diferencia('10.5', '4.25')).toBe('6.250000');
  });

  it('es nula si falta un corte', () => {
    expect(diferencia('10', null)).toBeNull();
  });
});

describe('inicioDelAnio', () => {
  it('da el 1 de enero del año del corte', () => {
    expect(inicioDelAnio('2026-10-31')).toBe('2026-01-01');
  });
});
