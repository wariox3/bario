import type { DocumentoPorEmitir } from './emision-electronica.types';
import {
  ESTADO_ELECTRONICO_COLUMN,
  aFilaPorEmitir,
  esSeleccionable,
  resolverEstadoElectronico,
  resolverResolucionEtiqueta,
} from './estado-electronico';

function doc(campos: Partial<DocumentoPorEmitir> = {}): DocumentoPorEmitir {
  return { id: 1, numero: 1, estado_electronico_enviado: false, ...campos };
}

describe('estado-electronico', () => {
  it('enviando queda pendiente de respuesta, aun con un error anterior', () => {
    expect(resolverEstadoElectronico(doc({ estado_electronico_enviando: true }))).toBe(
      'pendienteRespuesta',
    );
    expect(
      resolverEstadoElectronico(
        doc({ estado_electronico_enviando: true, estado_electronico_error: true }),
      ),
    ).toBe('pendienteRespuesta');
  });

  it('enviado sin la bandera enviando también espera respuesta', () => {
    expect(resolverEstadoElectronico(doc({ estado_electronico_enviado: true }))).toBe(
      'pendienteRespuesta',
    );
  });

  it('sin enviar: error si el último intento falló, si no pendiente de envío', () => {
    expect(resolverEstadoElectronico(doc({ estado_electronico_error: true }))).toBe('error');
    expect(resolverEstadoElectronico(doc())).toBe('pendienteEnvio');
  });

  it('solo se puede marcar lo que no espera respuesta', () => {
    expect(esSeleccionable(doc())).toBe(true);
    expect(esSeleccionable(doc({ estado_electronico_error: true }))).toBe(true);
    expect(esSeleccionable(doc({ estado_electronico_enviando: true }))).toBe(false);
    expect(esSeleccionable(doc({ estado_electronico_enviado: true }))).toBe(false);
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
    const enEspera = aFilaPorEmitir(doc({ estado_electronico_enviando: true }));

    expect(ESTADO_ELECTRONICO_COLUMN.toneFor?.(enEspera)).toBe('pending');
    expect(ESTADO_ELECTRONICO_COLUMN.cellActionFor?.(enEspera)).toBe(false);

    expect(ESTADO_ELECTRONICO_COLUMN.cellActionFor?.(conError)).toBe(true);
    expect(ESTADO_ELECTRONICO_COLUMN.cellActionFor?.(pendiente)).toBe(false);
    expect(ESTADO_ELECTRONICO_COLUMN.toneFor?.(conError)).toBe('critical');
    expect(ESTADO_ELECTRONICO_COLUMN.toneFor?.(pendiente)).toBeNull();
  });
});
