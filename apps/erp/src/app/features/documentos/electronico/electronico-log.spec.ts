import { armarRutas, eventoTono, validacionTexto } from './electronico-log';
import type { ElectronicoEvento, ElectronicoLog } from './electronico-log.model';

const evento = (
  pk: number,
  nombre: string,
  idMensaje: string,
  epoca: string,
  fecha = '2026-10-11T20:28:17-05:00',
): ElectronicoEvento => ({
  codigoEventoPk: pk,
  evento: nombre,
  correo: 'cliente@correo.com',
  fecha,
  idMensaje,
  motivo: null,
  epoca,
  correoFecha: '2026-10-11T20:28:17-05:00',
});

describe('log electrónico · rutas de entrega', () => {
  const log: ElectronicoLog = {
    correos: [
      {
        codigoCorreoPk: '<viejo>',
        fecha: '2026-10-11T20:28:17-05:00',
        numeroDocumento: 'FE2865',
        correo: 'cliente@correo.com',
        correoCopia: null,
      },
      {
        codigoCorreoPk: '<nuevo>',
        fecha: '2026-10-11T21:46:55-05:00',
        numeroDocumento: 'FE2865',
        correo: 'cliente@correo.com',
        correoCopia: null,
      },
    ],
    eventos: [
      // El pk del "entregado" es menor que el del "enviado": ordenar por pk mentiría.
      evento(5767717, 'abierto_primera', '<viejo>', '1791768522638'),
      evento(5767715, 'entregado', '<viejo>', '1791768498000'),
      evento(5767716, 'enviado', '<viejo>', '1791768497115'),
      evento(5767724, 'enviado', '<nuevo>', '1791773215736'),
      evento(1, 'entregado', '<huerfano>', '1791773300000'),
    ],
    validaciones: [],
  };

  it('ordena los pasos de cada envío por instante, no por id', () => {
    const viejo = armarRutas(log).find((r) => r.id === '<viejo>');
    expect(viejo?.eventos.map((e) => e.evento)).toEqual([
      'enviado',
      'entregado',
      'abierto_primera',
    ]);
  });

  it('pone primero el envío más reciente y no pierde eventos sin correo', () => {
    expect(armarRutas(log).map((r) => r.id)).toEqual(['<nuevo>', '<viejo>', '<huerfano>']);
  });
});

describe('log electrónico · tono y validaciones', () => {
  it('distingue avance, rebote y lo desconocido', () => {
    expect(eventoTono('entregado')).toBe('positivo');
    expect(eventoTono('rebote_duro')).toBe('negativo');
    expect(eventoTono('algo_nuevo')).toBe('neutro');
  });

  it('pinta una validación de texto u objeto', () => {
    expect(validacionTexto('Regla 90')).toBe('Regla 90');
    expect(validacionTexto({ codigo: 'FAD06', mensaje: 'CUFE inválido', extra: null })).toBe(
      'FAD06 · CUFE inválido',
    );
  });
});
