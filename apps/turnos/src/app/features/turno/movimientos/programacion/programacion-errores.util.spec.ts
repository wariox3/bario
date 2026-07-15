import { HttpErrorResponse } from '@angular/common/http';
import type { ProgramacionErrorItem } from './programacion.model';
import {
  construirGenerarErrores,
  extraerDetalleProgramacion,
  extraerErroresMasivo,
  extraerErroresProgramacion,
  mapearErroresLinea,
  mapearErroresMasivo,
  separarErroresProgramacion,
} from './programacion-errores.util';

/** 400 con el body dado (los extractores narrowean por `instanceof HttpErrorResponse`). */
function http400(error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ error, status: 400, statusText: 'Bad Request' });
}

/** Item de error del 400 con defaults; `fecha: null` = error de línea (sin celda). */
function errItem(over: Partial<ProgramacionErrorItem> = {}): ProgramacionErrorItem {
  return {
    fecha: '2026-07-01',
    turno_codigo: '1',
    codigo: 'dia_ocupado',
    mensaje: 'Ya existe programación para este día.',
    ...over,
  };
}

describe('extraerDetalleProgramacion', () => {
  it('devuelve null si no es un HttpErrorResponse', () => {
    expect(extraerDetalleProgramacion(new Error('x'))).toBeNull();
  });

  it('devuelve el `detail` cuando es string', () => {
    expect(extraerDetalleProgramacion(http400({ detail: 'El documento ya fue generado.' }))).toBe(
      'El documento ya fue generado.',
    );
  });

  it('une el `detail` cuando es lista de strings (DRF ValidationError)', () => {
    expect(extraerDetalleProgramacion(http400({ detail: ['Ya existe.', 'Revisá.'] }))).toBe(
      'Ya existe. Revisá.',
    );
  });

  it('devuelve null si el `detail` falta o la lista no tiene strings', () => {
    expect(extraerDetalleProgramacion(http400({}))).toBeNull();
    expect(extraerDetalleProgramacion(http400({ detail: [] }))).toBeNull();
  });
});

describe('extraerErroresProgramacion', () => {
  it('devuelve el body cuando trae `errores` (array)', () => {
    const body = { detail: 'x', errores: [errItem()] };
    expect(extraerErroresProgramacion(http400(body))).toEqual(body);
  });

  it('devuelve null sin `errores` o si no es HttpErrorResponse', () => {
    expect(extraerErroresProgramacion(http400({ detail: 'x' }))).toBeNull();
    expect(extraerErroresProgramacion({ error: { errores: [] } })).toBeNull();
  });
});

describe('extraerErroresMasivo', () => {
  it('devuelve el body cuando trae `resultados` (array)', () => {
    const body = { detail: 'x', resultados: [{ indice: 0, errores: [errItem()] }] };
    expect(extraerErroresMasivo(http400(body))).toEqual(body);
  });

  it('devuelve null sin `resultados`', () => {
    expect(extraerErroresMasivo(http400({ detail: 'x', errores: [] }))).toBeNull();
  });
});

describe('separarErroresProgramacion', () => {
  it('reparte por alcance: con fecha → celda; sin fecha → aviso', () => {
    const { celdas, avisos } = separarErroresProgramacion([
      errItem({ fecha: '2026-07-01', mensaje: 'día ocupado' }),
      errItem({ fecha: null, mensaje: 'horas excedidas' }),
    ]);
    expect(celdas.get('2026-07-01')).toBe('día ocupado');
    expect(avisos).toEqual(['horas excedidas']);
  });
});

describe('mapearErroresMasivo', () => {
  const payloads = [{ documento_detalle_id: 10 }, { documento_detalle_id: 20 }];
  const scopeOf = (p: { documento_detalle_id: number }) => p.documento_detalle_id;

  it('mapea celdas/avisos por scope resolviendo el id desde payloads[indice]', () => {
    const err = http400({
      detail: 'Hay días con errores.',
      resultados: [
        { indice: 0, errores: [errItem({ fecha: '2026-07-01', mensaje: 'ocupado' })] },
        { indice: 1, errores: [errItem({ fecha: null, mensaje: 'horas excedidas' })] },
      ],
    });
    const { celdas, avisos, globales } = mapearErroresMasivo(err, payloads, scopeOf);
    expect(celdas.get(10)?.get('2026-07-01')).toBe('ocupado');
    expect(avisos.get(20)).toEqual(['horas excedidas']);
    expect(globales).toEqual([]);
  });

  it('saltea resultados cuyo payload[indice] no existe', () => {
    const err = http400({ resultados: [{ indice: 99, errores: [errItem()] }] });
    const { celdas, avisos } = mapearErroresMasivo(err, payloads, scopeOf);
    expect(celdas.size).toBe(0);
    expect(avisos.size).toBe(0);
  });

  it('sin `resultados` (validación global del batch) manda los mensajes a globales', () => {
    const err = http400({
      detail: 'x',
      errores: [errItem({ fecha: null, mensaje: 'tope de horas' })],
    });
    const { globales, celdas } = mapearErroresMasivo(err, payloads, scopeOf);
    expect(globales).toEqual(['tope de horas']);
    expect(celdas.size).toBe(0);
  });
});

describe('mapearErroresLinea', () => {
  it('mapea los errores de la única línea al scopeId dado', () => {
    const err = http400({ errores: [errItem({ fecha: '2026-07-02', mensaje: 'ocupado' })] });
    const { celdas } = mapearErroresLinea(err, 10);
    expect(celdas.get(10)?.get('2026-07-02')).toBe('ocupado');
  });
});

describe('construirGenerarErrores', () => {
  it('agrupa por mensaje y deduplica días (una entrada por turno del mismo día)', () => {
    const parsed = {
      detail: 'Hay días con errores en la programación.',
      errores: [
        errItem({ fecha: '2026-07-01', turno_codigo: '1' }),
        errItem({ fecha: '2026-07-01', turno_codigo: '2' }), // mismo día → 1 solo día
        errItem({ fecha: '2026-07-03', turno_codigo: 'D' }),
      ],
    };
    const vista = construirGenerarErrores(parsed);
    expect(vista.detail).toBe('Hay días con errores en la programación.');
    expect(vista.grupos).toHaveLength(1);
    expect(vista.grupos[0].dias).toEqual(['1', '3']);
  });

  it('separa los errores sin fecha como avisos (dedup)', () => {
    const vista = construirGenerarErrores({
      detail: 'x',
      errores: [
        errItem({ fecha: null, mensaje: 'horas excedidas' }),
        errItem({ fecha: null, mensaje: 'horas excedidas' }),
      ],
    });
    expect(vista.grupos).toEqual([]);
    expect(vista.avisos).toEqual(['horas excedidas']);
  });
});
