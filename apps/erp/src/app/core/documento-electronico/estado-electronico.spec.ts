import type { DocumentoPorEmitir } from './emision-electronica.types';
import {
  ESTADO_ELECTRONICO_COLUMN,
  aFilaPorEmitir,
  resolverEstadoElectronico,
  resolverResolucionEtiqueta,
} from './estado-electronico';

function doc(campos: Partial<DocumentoPorEmitir> = {}): DocumentoPorEmitir {
  return { id: 1, numero: 1, estado_electronico_enviado: false, ...campos };
}

describe('estado-electronico', () => {
  it('el error gana sobre enviado y pendiente', () => {
    expect(resolverEstadoElectronico(doc({ estado_electronico_error: true }))).toBe('error');
    expect(resolverEstadoElectronico(doc({ estado_electronico_enviado: true }))).toBe('enviado');
    expect(resolverEstadoElectronico(doc())).toBe('pendiente');
  });

  it('une prefijo y número de la resolución, sin relleno si faltan', () => {
    expect(
      resolverResolucionEtiqueta(doc({ resolucion_prefijo: 'SETP', resolucion_numero: '187' })),
    ).toBe('SETP 187');
    expect(resolverResolucionEtiqueta(doc({ resolucion_numero: '187' }))).toBe('187');
    expect(resolverResolucionEtiqueta(doc())).toBe('');
  });

  it('solo la celda de una fila con error es clicable y crítica', () => {
    const conError = aFilaPorEmitir(doc({ estado_electronico_error: true }));
    const pendiente = aFilaPorEmitir(doc());

    expect(ESTADO_ELECTRONICO_COLUMN.cellActionFor?.(conError)).toBe(true);
    expect(ESTADO_ELECTRONICO_COLUMN.cellActionFor?.(pendiente)).toBe(false);
    expect(ESTADO_ELECTRONICO_COLUMN.toneFor?.(conError)).toBe('critical');
    expect(ESTADO_ELECTRONICO_COLUMN.toneFor?.(pendiente)).toBeNull();
  });
});
